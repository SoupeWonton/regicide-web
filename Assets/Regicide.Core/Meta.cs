using System.Globalization;
using System.Text;

namespace Regicide.Core
{
    /// <summary>
    /// The lineage — the ONLY thing that persists between runs (§2, §14). Meta banks
    /// options, not power: it must never grant permanent stat boosts. For the alpha
    /// it tracks runs, wins and whether C2 has been cleared (unlocks the extra path
    /// option later); the shape leaves room to grow.
    ///
    /// Serialization is a deliberately tiny hand-rolled JSON round-trip — three
    /// fields, no dependency. The Unity layer supplies the file path
    /// (Application.persistentDataPath); Core never references UnityEngine.
    /// </summary>
    /// <summary>One line of run history: enough to tell runs apart, nothing more.</summary>
    public sealed class RunRecord
    {
        public int N;
        public string ClassId = "";
        public string StaffId = "";
        public string Seed = "";
        /// <summary>"abandoned" (app closed mid-run — no save by design) · "lost" · "won".</summary>
        public string Outcome = "abandoned";
        public int Chapter = 1;
    }

    public sealed class MetaState
    {
        public const int CurrentVersion = 2;
        /// <summary>History is capped — the lineage records identity, not a database.</summary>
        public const int HistoryCap = 50;

        public int Version = CurrentVersion;
        public int Runs;
        public int Wins;
        /// <summary>True once any run has been crowned at the King Gate (§14).</summary>
        public bool C2Cleared;
        /// <summary>Opt-OUT anonymous run reporting (settings toggle). Default ON.</summary>
        public bool ShareRunData = true;
        /// <summary>Anonymous install id for run reports — a GUID the app layer
        /// generates once (when empty) and persists via the normal meta save.</summary>
        public string InstallId = "";
        /// <summary>Most recent last. Playtest evidence: which run had which class/staff/seed.</summary>
        public System.Collections.Generic.List<RunRecord> History =
            new System.Collections.Generic.List<RunRecord>();

        public RunRecord LatestRun => History.Count > 0 ? History[History.Count - 1] : null;

        /// <summary>Call when a new run begins. Class/staff land later via RecordRunClass.</summary>
        public void RecordRunStart(string seed = "")
        {
            Runs++;
            History.Add(new RunRecord { N = Runs, Seed = Clean(seed) });
            if (History.Count > HistoryCap) History.RemoveAt(0);
        }

        /// <summary>Call once class select resolves — stamps the run's identity.</summary>
        public void RecordRunClass(CampaignState run)
        {
            var r = LatestRun;
            if (r == null) return;
            r.ClassId = Clean(run.Hero.ClassId);
            r.StaffId = Clean(run.Hero.StaffId);
        }

        /// <summary>Call when a run ends (won or lost). Milestones stay banked (§14).</summary>
        public void RecordOutcome(CampaignState run)
        {
            if (run.Phase == CampaignPhase.CampaignWon)
            {
                Wins++;
                C2Cleared = true;
            }
            var r = LatestRun;
            if (r != null)
            {
                r.Outcome = run.Phase == CampaignPhase.CampaignWon ? "won" : "lost";
                r.Chapter = run.Chapter;
            }
        }

        /// <summary>
        /// Stored strings are sanitized on WRITE (no quotes/braces/backslashes, capped)
        /// so the tiny hand-rolled parser below never meets an escape sequence.
        /// </summary>
        private static string Clean(string s) => Clean(s, 24);

        private static string Clean(string s, int max)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var sb = new StringBuilder();
            foreach (char c in s)
            {
                if (c == '"' || c == '\\' || c == '{' || c == '}' || c == '[' || c == ']' || c == ',') continue;
                sb.Append(c);
                if (sb.Length >= max) break;
            }
            return sb.ToString();
        }

        public string ToJson()
        {
            var sb = new StringBuilder();
            sb.Append("{\"version\":").Append(Version.ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"runs\":").Append(Runs.ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"wins\":").Append(Wins.ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"c2Cleared\":").Append(C2Cleared ? "true" : "false");
            sb.Append(",\"shareRunData\":").Append(ShareRunData ? "true" : "false");
            // The GUID (32 hex chars) outgrows the default 24-char cap.
            sb.Append(",\"installId\":\"").Append(Clean(InstallId, 40)).Append('"');
            sb.Append(",\"history\":[");
            for (int i = 0; i < History.Count; i++)
            {
                var r = History[i];
                if (i > 0) sb.Append(',');
                sb.Append("{\"n\":").Append(r.N.ToString(CultureInfo.InvariantCulture));
                sb.Append(",\"class\":\"").Append(Clean(r.ClassId)).Append('"');
                sb.Append(",\"staff\":\"").Append(Clean(r.StaffId)).Append('"');
                sb.Append(",\"seed\":\"").Append(Clean(r.Seed)).Append('"');
                sb.Append(",\"outcome\":\"").Append(Clean(r.Outcome)).Append('"');
                sb.Append(",\"chapter\":").Append(r.Chapter.ToString(CultureInfo.InvariantCulture));
                sb.Append('}');
            }
            sb.Append("]}");
            return sb.ToString();
        }

        /// <summary>Parse what <see cref="ToJson"/> wrote. Unknown/missing fields default — never throws.</summary>
        public static MetaState FromJson(string json)
        {
            var meta = new MetaState();
            if (string.IsNullOrEmpty(json)) return meta;
            meta.Version = ReadInt(json, "version", CurrentVersion);
            meta.Runs = ReadInt(json, "runs", 0);
            meta.Wins = ReadInt(json, "wins", 0);
            meta.C2Cleared = ReadBool(json, "c2Cleared");
            // Missing on pre-v2 files → the opt-OUT default (true), not false.
            meta.ShareRunData = ReadBool(json, "shareRunData", true);
            meta.InstallId = ReadStr(json, "installId");

            // History: cleaned strings guarantee no nested braces — object splitting
            // on '}' is safe. A v1 file simply has no history (empty list).
            int h = json.IndexOf("\"history\":[", System.StringComparison.Ordinal);
            if (h >= 0)
            {
                int end = json.IndexOf(']', h);
                if (end > h)
                {
                    string body = json.Substring(h + 11, end - h - 11);
                    foreach (string chunk in body.Split('}'))
                    {
                        if (chunk.IndexOf('{') < 0) continue;
                        string obj = chunk.Substring(chunk.IndexOf('{')) + "}";
                        meta.History.Add(new RunRecord
                        {
                            N = ReadInt(obj, "n", 0),
                            ClassId = ReadStr(obj, "class"),
                            StaffId = ReadStr(obj, "staff"),
                            Seed = ReadStr(obj, "seed"),
                            Outcome = ReadStr(obj, "outcome") is string o && o.Length > 0 ? o : "abandoned",
                            Chapter = ReadInt(obj, "chapter", 1),
                        });
                    }
                    if (meta.History.Count > HistoryCap)
                        meta.History.RemoveRange(0, meta.History.Count - HistoryCap);
                }
            }
            return meta;
        }

        private static string ReadStr(string json, string field)
        {
            string raw = ReadRaw(json, field);
            if (raw == null) return "";
            return raw.Trim().Trim('"');
        }

        /// <summary>Load from disk; a missing or corrupt file yields a fresh lineage.</summary>
        public static MetaState LoadFrom(string path)
        {
            try
            {
                return System.IO.File.Exists(path) ? FromJson(System.IO.File.ReadAllText(path)) : new MetaState();
            }
            catch
            {
                return new MetaState(); // a broken save must never block playing (§1 pillar 6, in spirit)
            }
        }

        public void SaveTo(string path)
        {
            var dir = System.IO.Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir)) System.IO.Directory.CreateDirectory(dir);
            System.IO.File.WriteAllText(path, ToJson());
        }

        private static int ReadInt(string json, string field, int fallback)
        {
            string raw = ReadRaw(json, field);
            return raw != null && int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out int v)
                ? v : fallback;
        }

        private static bool ReadBool(string json, string field) => ReadRaw(json, field) == "true";

        private static bool ReadBool(string json, string field, bool fallback)
        {
            string raw = ReadRaw(json, field);
            if (raw == "true") return true;
            if (raw == "false") return false;
            return fallback;
        }

        private static string ReadRaw(string json, string field)
        {
            int key = json.IndexOf("\"" + field + "\"", System.StringComparison.Ordinal);
            if (key < 0) return null;
            int colon = json.IndexOf(':', key);
            if (colon < 0) return null;
            int end = colon + 1;
            while (end < json.Length && json[end] != ',' && json[end] != '}') end++;
            return json.Substring(colon + 1, end - colon - 1).Trim();
        }
    }
}
