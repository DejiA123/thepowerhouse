using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;

namespace Powerhouse.Backend.ReportService
{
    /// <summary>
    /// Utility for generating administrative reports for the choir management system.
    /// </summary>
    public class ReportGenerator
    {
        public string ReportType { get; set; }

        public ReportGenerator(string reportType)
        {
            ReportType = reportType;
        }

        public void GenerateMonthlyReport(List<string> metrics)
        {
            Console.WriteLine($"--- Generating {ReportType} Report ---");
            Console.WriteLine($"Date: {DateTime.Now.ToShortDateString()}");
            
            foreach (var metric in metrics)
            {
                Console.WriteLine($"[METRIC] {metric}");
            }
            
            Console.WriteLine("--- End of Report ---");
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
            var generator = new ReportGenerator("Financial & Attendance");
            var sampleMetrics = new List<string>
            {
                "Total Tithes: $15,000",
                "Choir Attendance: 98%",
                "New Visitors: 12"
            };

            generator.GenerateMonthlyReport(sampleMetrics);
            
            // Keep console open for debug
            Console.WriteLine("\nPress any key to exit...");
        }
    }
}
