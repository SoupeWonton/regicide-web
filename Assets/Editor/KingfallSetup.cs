using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;
using Regicide.Unity;

namespace Kingfall.EditorTools
{
    /// <summary>
    /// One-shot project setup (BUILD-SPEC.md §16): creates the themed PanelSettings
    /// and the single Run scene (an empty GameObject carrying <see cref="RunApp"/>).
    /// Runs from the menu (Kingfall ▸ ...) or headlessly via
    /// <c>Unity.exe -batchmode -quit -executeMethod Kingfall.EditorTools.KingfallSetup.CreateRunScene</c>.
    /// </summary>
    public static class KingfallSetup
    {
        private const string ThemePath = "Assets/UI/UnityDefaultRuntimeTheme.tss";
        private const string PanelPath = "Assets/UI/KingfallPanelSettings.asset";
        private const string ScenePath = "Assets/Scenes/Run.unity";

        [MenuItem("Kingfall/Create Run Scene")]
        public static void CreateRunScene()
        {
            // 1. The default runtime theme — the same file the UI Toolkit
            //    "Default Runtime Theme File" menu item writes.
            Directory.CreateDirectory("Assets/UI");
            if (!File.Exists(ThemePath))
            {
                File.WriteAllText(ThemePath, "@import url(\"unity-theme://default\");");
                AssetDatabase.ImportAsset(ThemePath);
            }
            var theme = AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>(ThemePath);

            // 2. PanelSettings carrying that theme.
            var ps = AssetDatabase.LoadAssetAtPath<PanelSettings>(PanelPath);
            if (ps == null)
            {
                ps = ScriptableObject.CreateInstance<PanelSettings>();
                ps.themeStyleSheet = theme;
                AssetDatabase.CreateAsset(ps, PanelPath);
            }
            else if (ps.themeStyleSheet == null)
            {
                ps.themeStyleSheet = theme;
                EditorUtility.SetDirty(ps);
            }

            // Scale the whole panel with the window (playtest: fixed-pixel rails
            // overflowed into scrollbars on other resolutions/DPIs). Reference
            // 1600×900 = the default window, so at that size the scale is exactly
            // 1.0 and nothing changes. Enforced every run — the asset may predate this.
            var referenceResolution = new Vector2Int(1600, 900);
            if (ps.scaleMode != PanelScaleMode.ScaleWithScreenSize ||
                ps.referenceResolution != referenceResolution ||
                ps.screenMatchMode != PanelScreenMatchMode.MatchWidthOrHeight ||
                !Mathf.Approximately(ps.match, 0.5f))
            {
                ps.scaleMode = PanelScaleMode.ScaleWithScreenSize;
                ps.referenceResolution = referenceResolution;
                ps.screenMatchMode = PanelScreenMatchMode.MatchWidthOrHeight;
                ps.match = 0.5f;
                EditorUtility.SetDirty(ps);
            }

            // 3. The one Run scene: a camera (keeps the player renderer happy) and
            //    an empty GameObject carrying RunApp — the whole game drives itself.
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var camGo = new GameObject("Main Camera");
            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.09f, 0.09f, 0.11f);
            camGo.tag = "MainCamera";

            var runGo = new GameObject("Run");
            var app = runGo.AddComponent<RunApp>();
            app.panelSettings = ps;

            Directory.CreateDirectory("Assets/Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("[Kingfall] Run scene + PanelSettings created.");
        }

        [MenuItem("Kingfall/Build Windows Player")]
        public static void BuildWindows()
        {
            CreateRunScene();

            // A desktop app, not a kiosk: windowed by default, freely resizable,
            // fullscreen still available (Alt+Enter). UI Toolkit flex reflows.
            PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
            PlayerSettings.defaultScreenWidth = 1600;
            PlayerSettings.defaultScreenHeight = 900;
            PlayerSettings.resizableWindow = true;
            PlayerSettings.allowFullscreenSwitch = true;
            PlayerSettings.runInBackground = true;
            var report = BuildPipeline.BuildPlayer(
                new[] { ScenePath },
                "Builds/Windows/Kingfall.exe",
                BuildTarget.StandaloneWindows64,
                BuildOptions.None);
            if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
                throw new System.Exception($"[Kingfall] Build failed: {report.summary.result}");
            Debug.Log($"[Kingfall] Build OK → {report.summary.outputPath}");
        }

        /// <summary>
        /// The alpha web build (hosted at llgames.ca/play). Gzip WITH the JS
        /// decompression fallback so any static host serves it without
        /// Content-Encoding header configuration.
        /// </summary>
        [MenuItem("Kingfall/Build Web Player")]
        public static void BuildWeb()
        {
            CreateRunScene();

            PlayerSettings.runInBackground = true;
            PlayerSettings.WebGL.template = "PROJECT:Kingfall"; // fullscreen canvas, night bg
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.decompressionFallback = true;
            // Persist lineage.json across sessions (IndexedDB auto-sync) when this
            // editor exposes the flag — reflection keeps older editors compiling.
            var sync = typeof(PlayerSettings.WebGL).GetProperty("autoSyncPersistentDataPath",
                System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public);
            if (sync != null) sync.SetValue(null, true);

            var report = BuildPipeline.BuildPlayer(
                new[] { ScenePath },
                "Builds/Web",
                BuildTarget.WebGL,
                BuildOptions.None);
            if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
                throw new System.Exception($"[Kingfall] Web build failed: {report.summary.result}");
            Debug.Log($"[Kingfall] Web build OK → {report.summary.outputPath}");
        }
    }
}
