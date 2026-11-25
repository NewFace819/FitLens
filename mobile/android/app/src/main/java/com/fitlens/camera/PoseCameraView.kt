package com.fitlens.camera

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.SystemClock
import android.util.Size
import android.util.Log
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.bridge.WritableMap
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import java.util.concurrent.Executors

/** Frames stay in RAM. No recording, network requests or image persistence. */
class PoseCameraView(private val reactContext: ThemedReactContext) : FrameLayout(reactContext), LifecycleEventListener {
  private val previewView = PreviewView(reactContext)
  private val worker = Executors.newSingleThreadExecutor()
  private var provider: ProcessCameraProvider? = null
  private var preview: Preview? = null
  private var analysis: ImageAnalysis? = null
  private var detector: PoseLandmarker? = null // touched only by worker
  @Volatile private var generation = 0
  private var requested = false
  private var front = false
  private var disposed = false
  private var resumed = true
  private var lastFrameMs = 0L
  private var lastErrorMs = 0L

  init {
    previewView.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    previewView.scaleType = PreviewView.ScaleType.FIT_CENTER
    addView(previewView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    reactContext.addLifecycleEventListener(this)
  }
  // React Native lays out only the outer native view; explicitly measure its PreviewView child.
  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    super.onLayout(changed, l, t, r, b)
    previewView.measure(MeasureSpec.makeMeasureSpec(r-l, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(b-t, MeasureSpec.EXACTLY))
    previewView.layout(0, 0, r-l, b-t)
  }
  // CameraX inserts its TextureView asynchronously. React Native otherwise suppresses
  // that child layout request, leaving the preview surface at zero size.
  override fun requestLayout() {
    super.requestLayout()
    post {
      if (width > 0 && height > 0) {
        measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
        layout(left, top, right, bottom)
      }
    }
  }
  fun setCameraActive(value: Boolean) { if(requested == value) return; requested = value; restart() }
  fun setFrontFacing(value: Boolean) { if(front == value) return; front = value; restart() }
  override fun onAttachedToWindow() { super.onAttachedToWindow(); start() }
  override fun onDetachedFromWindow() { stop(); super.onDetachedFromWindow() }
  override fun onHostResume() { resumed = true; start() }
  override fun onHostPause() { resumed = false; stop() }
  override fun onHostDestroy() { dispose() }
  private fun restart() { stop(); start() }

  private fun start() {
    if(disposed || !requested || !resumed || !isAttachedToWindow || analysis != null) return
    if(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) { fail("permission", "Camera permission is required."); return }
    val owner = reactContext.currentActivity as? LifecycleOwner
    if(owner == null) { fail("lifecycle", "Camera is unavailable while the app is inactive."); return }
    val token = ++generation
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      if(disposed || token != generation || !requested || !resumed || !isAttachedToWindow) return@addListener
      try {
        val cameraProvider = future.get()
        val selector = if(front) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
        if(!cameraProvider.hasCamera(selector)) { fail("unavailable", "This camera is not available. Try the other camera."); return@addListener }
        provider = cameraProvider
        val usePreview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
        val useAnalysis = ImageAnalysis.Builder().setTargetResolution(Size(640, 480))
          .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
        preview = usePreview; analysis = useAnalysis
        lastFrameMs = 0
        useAnalysis.setAnalyzer(worker) { image ->
          var bitmap: Bitmap? = null
          try {
            val now = SystemClock.uptimeMillis()
            if(token == generation && now - lastFrameMs >= 90) {
              lastFrameMs = now
              if(detector == null) detector = PoseLandmarker.createFromOptions(context,
                PoseLandmarker.PoseLandmarkerOptions.builder()
                  .setBaseOptions(BaseOptions.builder().setModelAssetPath("pose_landmarker_lite.task").build())
                  .setRunningMode(RunningMode.VIDEO).setNumPoses(1)
                  .setMinPoseDetectionConfidence(0.5f).setMinPosePresenceConfidence(0.5f)
                  .setMinTrackingConfidence(0.5f).build())
              val plane = image.planes[0]
              val padded = Bitmap.createBitmap(plane.rowStride / 4, image.height, Bitmap.Config.ARGB_8888)
              plane.buffer.rewind(); padded.copyPixelsFromBuffer(plane.buffer)
              val cropped = Bitmap.createBitmap(padded, 0, 0, image.width, image.height)
              if(cropped !== padded) padded.recycle()
              val matrix = Matrix().apply { postRotate(image.imageInfo.rotationDegrees.toFloat()) }
              bitmap = Bitmap.createBitmap(cropped, 0, 0, cropped.width, cropped.height, matrix, true)
              if(bitmap !== cropped) cropped.recycle()
              val input = BitmapImageBuilder(bitmap!!).build()
              try {
                val result = detector!!.detectForVideo(input, now)
                val points = Arguments.createArray()
                result.landmarks().firstOrNull()?.forEach { landmark ->
                  points.pushMap(Arguments.createMap().apply {
                    putDouble("x", landmark.x().toDouble()); putDouble("y", landmark.y().toDouble())
                    putDouble("visibility", landmark.visibility().orElse(0f).toDouble())
                  })
                }
                val data = Arguments.createMap().apply {
                  putDouble("tMs", now.toDouble()); putInt("width", bitmap!!.width); putInt("height", bitmap!!.height)
                  putArray("landmarks", points)
                }
                post { if(token == generation && requested && !disposed) emit("topPose", data) }
              } finally { input.close() }
            }
          } catch(error: Throwable) {
            val now = SystemClock.uptimeMillis()
            if(now - lastErrorMs > 2000) { lastErrorMs = now; Log.e("FitLensCamera", "Pose inference failed", error); post { if(token == generation) fail("inference", "Pose detection failed. Close and reopen the camera.") } }
          } finally { bitmap?.recycle(); image.close() }
        }
        cameraProvider.bindToLifecycle(owner, selector, usePreview, useAnalysis)
      } catch(error: Throwable) { Log.e("FitLensCamera", "Camera start failed", error); stop(); fail("camera", "Camera could not start. Try again or switch camera.") }
    }, ContextCompat.getMainExecutor(context))
  }
  private fun stop() {
    ++generation
    analysis?.clearAnalyzer()
    val owned = listOfNotNull(preview, analysis)
    if(owned.isNotEmpty()) provider?.unbind(*owned.toTypedArray())
    preview = null; analysis = null
    if(!worker.isShutdown) worker.execute { detector?.close(); detector = null }
  }
  fun dispose() {
    if(disposed) return
    disposed = true; stop(); reactContext.removeLifecycleEventListener(this); worker.shutdown()
  }
  private fun fail(code: String, message: String) { emit("topCameraError", Arguments.createMap().apply { putString("code", code); putString("message", message) }) }
  private fun emit(name: String, payload: WritableMap) {
    if(id == NO_ID || !reactContext.hasActiveReactInstance()) return
    val surfaceId = UIManagerHelper.getSurfaceId(this)
    UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)?.dispatchEvent(PoseEvent(surfaceId, id, name, payload))
  }
  private class PoseEvent(surfaceId: Int, viewId: Int, private val name: String, private val payload: WritableMap) : Event<PoseEvent>(surfaceId, viewId) {
    override fun getEventName() = name
    override fun getEventData() = payload
    override fun canCoalesce() = false
  }
}
