using System;
using UnityEngine;
using Regicide.Core;

namespace Regicide.Unity
{
    /// <summary>
    /// Anonymous end-of-run telemetry (opt-OUT via the settings toggle —
    /// <see cref="MetaState.ShareRunData"/>). Fires once per run end, right after
    /// RecordOutcome stamps the lineage, and rides Net's fire-and-forget POST:
    /// a dead llgame.ca can never surface to the player.
    /// </summary>
    public static class Reporter
    {
        private const string Url = "https://llgame.ca/data/runs";

        [Serializable]
        private class Payload
        {
            public string installId;
            public string version;
            public int runN;
            public string classId;
            public string staffId;
            public string seed;
            public string outcome;
            public int chapter;
            public string endedAt;
        }

        /// <summary>
        /// Report the run that just ended. Call AFTER <c>meta.RecordOutcome(s)</c> —
        /// the freshest history record carries the run's identity and outcome.
        /// </summary>
        public static void ReportRunEnd(MetaState meta, CampaignState s)
        {
            if (meta == null || !meta.ShareRunData) return;
            try
            {
                var run = meta.LatestRun; // RecordOutcome just stamped this record
                var p = new Payload
                {
                    installId = meta.InstallId ?? "",
                    version = GameVersion.Current,
                    runN = meta.Runs,
                    classId = run != null ? run.ClassId : "",
                    staffId = run != null ? run.StaffId : "",
                    seed = run != null ? run.Seed : "",
                    outcome = run != null ? run.Outcome : "",
                    chapter = run != null ? run.Chapter : (s != null ? s.Chapter : 1),
                    endedAt = DateTime.UtcNow.ToString("o"),
                };
                Net.PostJson(Url, JsonUtility.ToJson(p));
            }
            catch
            {
                // Telemetry must never break a run end — swallow everything.
            }
        }
    }
}
