using System;
using UnityEngine.Networking;

namespace Regicide.Unity
{
    /// <summary>
    /// Thin fire-and-forget JSON transport for the run reporter and the update
    /// check. No coroutine host needed — completion rides the request's own
    /// async-op callback. Network failure is always a silent no-op: nothing in
    /// the game may ever block or complain because llgame.ca is unreachable.
    /// </summary>
    public static class Net
    {
        public const int TimeoutSeconds = 10;

        /// <summary>GET url; onDone gets the body, or null on any failure.</summary>
        public static void GetJson(string url, Action<string> onDone)
        {
            var req = UnityWebRequest.Get(url);
            req.timeout = TimeoutSeconds;
            Send(req, onDone);
        }

        /// <summary>POST json to url; onDone (optional) gets the body, null on failure.</summary>
        public static void PostJson(string url, string json, Action<string> onDone = null)
        {
            var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST);
            req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(json));
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");
            req.timeout = TimeoutSeconds;
            Send(req, onDone);
        }

        /// <summary>GET url straight to a file (installer download); onDone gets
        /// success. The .part temp name guards against half-written files.</summary>
        public static void GetFile(string url, string path, Action<bool> onDone)
        {
            var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbGET);
            req.downloadHandler = new DownloadHandlerFile(path) { removeFileOnAbort = true };
            req.timeout = 0; // installers take as long as they take
            req.SendWebRequest().completed += _ =>
            {
                bool ok = req.result == UnityWebRequest.Result.Success;
                req.Dispose();
                try { onDone?.Invoke(ok); } catch { /* callbacks never throw outward */ }
            };
        }

        private static void Send(UnityWebRequest req, Action<string> onDone)
        {
            req.SendWebRequest().completed += _ =>
            {
                string body = req.result == UnityWebRequest.Result.Success
                    ? req.downloadHandler.text : null;
                req.Dispose();
                try { onDone?.Invoke(body); } catch { /* callbacks never throw outward */ }
            };
        }
    }
}
