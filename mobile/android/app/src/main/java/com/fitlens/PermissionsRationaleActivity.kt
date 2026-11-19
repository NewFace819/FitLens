package com.fitlens

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * Activity displayed when Health Connect requests the app's privacy policy
 * and permission rationale (Android 14+ via ViewPermissionUsageActivity alias,
 * and Android 13- via ACTION_SHOW_PERMISSIONS_RATIONALE).
 */
class PermissionsRationaleActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val scrollView = ScrollView(this).apply {
            setBackgroundColor(Color.parseColor("#F7F3EC"))
            isFillViewport = true
        }

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(64, 96, 64, 64)
            gravity = Gravity.CENTER_HORIZONTAL
        }

        val brand = TextView(this).apply {
            text = "FITLENS"
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            letterSpacing = 0.25f
            setTextColor(Color.parseColor("#273046"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 32)
        }
        container.addView(brand)

        val title = TextView(this).apply {
            text = "Health Connect & Privacy"
            textSize = 26f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#273046"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 24)
        }
        container.addView(title)

        val rationale = TextView(this).apply {
            text = "FitLens reads your daily step count from Health Connect solely to display your activity preview and progress on your device upon your request.\n\n" +
                   "• Read only: FitLens requests permission only for steps (READ_STEPS).\n" +
                   "• Private by design: FitLens does not upload, sell, or transmit your health records to any server, analytics provider, advertising network, or AI service.\n" +
                   "• You choose what to share: You can revoke access at any time in Health Connect settings without affecting your workouts.\n\n" +
                   "Your workouts and routines in FitLens continue to work completely even if you choose not to connect Health Connect."
            textSize = 16f
            setLineSpacing(0f, 1.35f)
            setTextColor(Color.parseColor("#505B70"))
            setPadding(0, 0, 0, 48)
        }
        container.addView(rationale)

        val closeButton = Button(this).apply {
            text = "Close"
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#4F68D5"))
            setPadding(32, 24, 32, 24)
            setOnClickListener { finish() }
        }
        container.addView(closeButton)

        scrollView.addView(container)
        setContentView(scrollView)
    }
}
