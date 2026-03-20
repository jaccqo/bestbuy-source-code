// src/hooks/use-system-notification.ts
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification"

export async function sendSystemNotification(title: string, body: string) {
  let permissionGranted = await isPermissionGranted()

  if (!permissionGranted) {
    const permission = await requestPermission()
    permissionGranted = permission === "granted"
  }

  if (permissionGranted) {
    sendNotification({
      title,
      body,
      // icon: "@mipmap/ic_launcher", // optional: custom icon
      // sound: "default", // optional
    })
  }
}