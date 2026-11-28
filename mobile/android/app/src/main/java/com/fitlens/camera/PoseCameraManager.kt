package com.fitlens.camera

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class PoseCameraManager : SimpleViewManager<PoseCameraView>() {
  override fun getName() = "FitLensPoseCamera"
  override fun createViewInstance(context: ThemedReactContext) = PoseCameraView(context)
  @ReactProp(name = "active", defaultBoolean = false)
  fun setActive(view: PoseCameraView, value: Boolean) { view.setCameraActive(value) }
  @ReactProp(name = "front", defaultBoolean = false)
  fun setFront(view: PoseCameraView, value: Boolean) { view.setFrontFacing(value) }
  override fun onDropViewInstance(view: PoseCameraView) { view.dispose(); super.onDropViewInstance(view) }
  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> = mapOf(
    "topPose" to mapOf("registrationName" to "onPose"),
    "topCameraError" to mapOf("registrationName" to "onCameraError")
  )
}
