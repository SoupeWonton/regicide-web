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
    public sealed class MetaState
    {
        public const int CurrentVersion = 1;

        public int Version = CurrentVersion;
        public int Runs;
        public int Wins;
        /// <summary>True once any run has been crowned at the King Gate (§14).</summary>
        public bool C2Cleared;

        /// <summary>Call when a new run begins.</summary>
        public void RecordRunStart() => Runs++;

        /// <summary>Call when a run ends (won or lost). Milestones stay banked (§14).</summary>
        public void RecordOutcome(CampaignState run)
        {
            if (run.Phase == CampaignPhase.CampaignWon)
            {
                Wins++;
                C2Cleared = true;
            }
        }

        public string ToJson()
        {
            var sb = new StringBuilder();
            sb.Append("{\"version\":").Append(Version.ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"runs\":").Append(Runs.ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"wins\":").Append(Wins.ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"c2Cleared\":").Append(C2Cleared ? "true" : "false");
            sb.Append('}');
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
            return meta;
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
