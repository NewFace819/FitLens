package com.fitlens.healthconnect

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class FitLensHealthConnectModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var pendingPermissionPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "FitLensHealthConnect"

    @ReactMethod
    fun getSdkStatus(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.resolve("unavailable")
            return
        }
        try {
            val status = HealthConnectClient.getSdkStatus(reactApplicationContext)
            when (status) {
                HealthConnectClient.SDK_AVAILABLE -> promise.resolve("available")
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> promise.resolve("provider-update-required")
                else -> promise.resolve("unavailable")
            }
        } catch (e: Throwable) {
            promise.resolve("unavailable")
        }
    }

    @ReactMethod
    fun checkPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.resolve(false)
            return
        }
        try {
            val status = HealthConnectClient.getSdkStatus(reactApplicationContext)
            if (status != HealthConnectClient.SDK_AVAILABLE) {
                if (status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
                    promise.reject("PROVIDER_UPDATE_REQUIRED", "Provider update required")
                } else {
                    promise.resolve(false)
                }
                return
            }
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val client = HealthConnectClient.getOrCreate(reactApplicationContext)
                    val granted = client.permissionController.getGrantedPermissions()
                    val isGranted = granted.contains(HealthPermission.getReadPermission(StepsRecord::class))
                    promise.resolve(isGranted)
                } catch (e: Throwable) {
                    promise.reject("CHECK_PERMISSION_ERROR", e.message, e)
                }
            }
        } catch (e: Throwable) {
            promise.reject("CHECK_PERMISSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        val currentActivity = reactApplicationContext.currentActivity
        if (currentActivity == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.reject("UNAVAILABLE", "Health Connect is unavailable on this device")
            return
        }
        val status = HealthConnectClient.getSdkStatus(reactApplicationContext)
        if (status != HealthConnectClient.SDK_AVAILABLE) {
            if (status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
                promise.reject("PROVIDER_UPDATE_REQUIRED", "Health Connect needs to be installed or updated")
            } else {
                promise.reject("UNAVAILABLE", "Health Connect is unavailable on this device")
            }
            return
        }
        if (pendingPermissionPromise != null) {
            promise.reject("ALREADY_IN_FLIGHT", "A permission request is already in flight")
            return
        }

        pendingPermissionPromise = promise
        try {
            val contract = PermissionController.createRequestPermissionResultContract()
            val permissions = setOf(HealthPermission.getReadPermission(StepsRecord::class))
            val intent = contract.createIntent(reactApplicationContext, permissions)
            currentActivity.startActivityForResult(intent, REQUEST_CODE_HEALTH_PERMISSIONS)
        } catch (e: Throwable) {
            pendingPermissionPromise = null
            promise.reject("REQUEST_LAUNCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getTodaySteps(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.reject("UNAVAILABLE", "Health Connect is unavailable on this device")
            return
        }
        val status = HealthConnectClient.getSdkStatus(reactApplicationContext)
        if (status != HealthConnectClient.SDK_AVAILABLE) {
            if (status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
                promise.reject("PROVIDER_UPDATE_REQUIRED", "Health Connect needs to be installed or updated")
            } else {
                promise.reject("UNAVAILABLE", "Health Connect is unavailable on this device")
            }
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = HealthConnectClient.getOrCreate(reactApplicationContext)
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.contains(HealthPermission.getReadPermission(StepsRecord::class))) {
                    promise.reject("PERMISSION_DENIED", "Permission android.permission.health.READ_STEPS is not granted")
                    return@launch
                }

                val zoneId = ZoneId.systemDefault()
                val todayMidnight = LocalDate.now(zoneId).atStartOfDay(zoneId).toInstant()
                val now = Instant.now()
                val request = AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(todayMidnight, now)
                )

                val response = client.aggregate(request)
                val stepCount = response[StepsRecord.COUNT_TOTAL]
                val map = Arguments.createMap()
                if (stepCount != null) {
                    map.putBoolean("hasData", true)
                    map.putDouble("steps", stepCount.toDouble())
                } else {
                    map.putBoolean("hasData", false)
                    map.putNull("steps")
                }
                promise.resolve(map)
            } catch (e: Throwable) {
                promise.reject("READ_STEPS_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun openHealthConnectSettings(promise: Promise) {
        try {
            val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Throwable) {
            try {
                val fallback = Intent(Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(fallback)
                promise.resolve(true)
            } catch (e2: Throwable) {
                promise.reject("SETTINGS_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun openHealthConnectProvider(promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Throwable) {
            try {
                val webIntent = Intent(Intent.ACTION_VIEW).apply {
                    data = Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(webIntent)
                promise.resolve(true)
            } catch (e2: Throwable) {
                promise.reject("PROVIDER_STORE_ERROR", e.message, e)
            }
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_CODE_HEALTH_PERMISSIONS) {
            val pending = pendingPermissionPromise
            pendingPermissionPromise = null
            if (pending != null) {
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val client = HealthConnectClient.getOrCreate(reactApplicationContext)
                        val granted = client.permissionController.getGrantedPermissions()
                        val isGranted = granted.contains(HealthPermission.getReadPermission(StepsRecord::class))
                        pending.resolve(isGranted)
                    } catch (e: Throwable) {
                        pending.reject("CHECK_PERMISSION_ERROR", e.message, e)
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {}

    companion object {
        private const val REQUEST_CODE_HEALTH_PERMISSIONS = 51241
    }
}
