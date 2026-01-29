using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.IO;
using System.Text.Json;

namespace Powerhouse.Backend.ReportService
{
    /*
     * Advanced Report Generation Service - Production-Grade C#
     * Demonstrates: Async/Await, LINQ, DI, Interfaces, Modern C# 12 features
     * 
     * Modern C# Features:
     * - Primary constructors (C# 12)
     * - Collection expressions (C# 12)
     * - Async/await pattern for I/O
     * - LINQ for data manipulation
     * - Dependency Injection pattern
     * - Interface-based design
     */

    // Record for immutable metric data (C# 9+ feature)
    public record MetricData(
        string Name,
        decimal Value,
        string Unit,
        DateTime Timestamp
    );

    // Interface for report formatters (Dependency Injection pattern)
    public interface IReportFormatter
    {
        Task<string> FormatAsync(ReportData data);
        string GetFormatName();
    }

    // Record for report configuration
    public record ReportConfig(
        string Title,
        string[] IncludedSections,
        bool IncludeTimestamp = true,
        bool IncludeSummary = true
    );

    // Data class for report structure
    public class ReportData
    {
        public string Title { get; init; } = "Untitled Report";
        public DateTime GeneratedAt { get; init; } = DateTime.Now;
        public List<MetricData> Metrics { get; init; } = [];
        public Dictionary<string, object> Metadata { get; init; } = new();
    }

    // Console formatter implementation
    public class ConsoleReportFormatter : IReportFormatter
    {
        public async Task<string> FormatAsync(ReportData data)
        {
            await Task.Delay(10); // Simulate async formatting work
            
            var lines = new List<string>
            {
                $"{'═', 60}",
                $"  {data.Title}",
                $"  Generated: {data.GeneratedAt:yyyy-MM-dd HH:mm:ss}",
                $"{'═', 60}",
                ""
            };

            foreach (var metric in data.Metrics)
            {
                lines.Add($"  [{metric.Name}] {metric.Value:N2} {metric.Unit}");
            }

            lines.Add("");
            lines.Add($"{'─', 60}");
            lines.Add($"  Total Metrics: {data.Metrics.Count}");
            lines.Add($"{'═', 60}");

            return string.Join(Environment.NewLine, lines);
        }

        public string GetFormatName() => "Console";
    }

    // JSON formatter implementation
    public class JsonReportFormatter : IReportFormatter
    {
        public async Task<string> FormatAsync(ReportData data)
        {
            await Task.Delay(10);
            
            var options = new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            return JsonSerializer.Serialize(data, options);
        }

        public string GetFormatName() => "JSON";
    }

    /// <summary>
    /// Advanced report generator with async operations and LINQ queries.
    /// Uses dependency injection for formatter strategy.
    /// </summary>
    public class AdvancedReportGenerator
    {
        private readonly IReportFormatter _formatter;
        private readonly ReportConfig _config;

        // Dependency Injection via constructor
        public AdvancedReportGenerator(IReportFormatter formatter, ReportConfig config)
        {
            _formatter = formatter ?? throw new ArgumentNullException(nameof(formatter));
            _config = config ?? throw new ArgumentNullException(nameof(config));
        }

        /// <summary>
        /// Generate report asynchronously with LINQ data processing.
        /// Demonstrates: async/await, LINQ, method chaining
        /// </summary>
        public async Task<string> GenerateAsync(IEnumerable<MetricData> metrics)
        {
            Console.WriteLine($"Generating {_config.Title} using {_formatter.GetFormatName()} format...");

            // LINQ: Filter, transform, and aggregate data
            var processedMetrics = metrics
                .Where(m => m.Value > 0) // Filter out zero values
                .OrderByDescending(m => m.Value) // Sort by value
                .Take(100) // Limit to top 100
                .Select(m => m with { Value = Math.Round(m.Value, 2) }) // Round values
                .ToList();

            // Calculate summary statistics using LINQ
            var summary = new
            {
                TotalMetrics = processedMetrics.Count,
                AverageValue = processedMetrics.Average(m => m.Value),
                MaxValue = processedMetrics.Max(m => m.Value),
                MinValue = processedMetrics.Min(m => m.Value),
                TotalValue = processedMetrics.Sum(m => m.Value)
            };

            Console.WriteLine($"Processed {summary.TotalMetrics} metrics (avg: {summary.AverageValue:N2})");

            // Build report data
            var reportData = new ReportData
            {
                Title = _config.Title,
                GeneratedAt = DateTime.Now,
                Metrics = processedMetrics,
                Metadata = new Dictionary<string, object>
                {
                    ["Summary"] = summary,
                    ["Config"] = _config
                }
            };

            // Async formatting
            return await _formatter.FormatAsync(reportData);
        }

        /// <summary>
        /// Save report to file asynchronously.
        /// Demonstrates: async I/O operations with proper error handling
        /// </summary>
        public async Task<bool> SaveToFileAsync(string content, string filePath)
        {
            try
            {
                await File.WriteAllTextAsync(filePath, content);
                Console.WriteLine($"Report saved to: {filePath}");
                return true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Failed to save report: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Generate multiple reports concurrently.
        /// Demonstrates: Task.WhenAll for parallel async operations
        /// </summary>
        public static async Task<string[]> GenerateBatchAsync(
            IEnumerable<MetricData> metrics,
            params IReportFormatter[] formatters)
        {
            var config = new ReportConfig(
                "Batch Report",
                ["Metrics", "Summary"]
            );

            var tasks = formatters.Select(async formatter =>
            {
                var generator = new AdvancedReportGenerator(formatter, config);
                return await generator.GenerateAsync(metrics);
            });

            return await Task.WhenAll(tasks);
        }
    }

    /// <summary>
    /// Service for analyzing metric trends.
    /// Demonstrates: Advanced LINQ queries and method chaining
    /// </summary>
    public class MetricAnalyzer
    {
        public static IEnumerable<string> FindTopPerformers(
            IEnumerable<MetricData> metrics,
            int topN = 5)
        {
            return metrics
                .GroupBy(m => m.Name)
                .Select(g => new
                {
                    Name = g.Key,
                    AverageValue = g.Average(m => m.Value),
                    Count = g.Count()
                })
                .OrderByDescending(x => x.AverageValue)
                .Take(topN)
                .Select(x => $"{x.Name} (Avg: {x.AverageValue:N2}, Count: {x.Count})");
        }

        public static decimal CalculateGrowthRate(IEnumerable<MetricData> metrics)
        {
            var orderedMetrics = metrics
                .OrderBy(m => m.Timestamp)
                .Select(m => m.Value)
                .ToList();

            if (orderedMetrics.Count < 2) return 0;

            var first = orderedMetrics.First();
            var last = orderedMetrics.Last();

            return first == 0 ? 0 : ((last - first) / first) * 100;
        }
    }

    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("=== Advanced C# Report Generation Service ===\n");

            // Sample metric data using collection expressions (C# 12)
            var sampleMetrics = new List<MetricData>
            {
                new("Total Tithes", 15000.00m, "USD", DateTime.Now.AddDays(-7)),
                new("Choir Attendance", 98.5m, "%", DateTime.Now.AddDays(-6)),
                new("New Visitors", 12m, "count", DateTime.Now.AddDays(-5)),
                new("Event Participation", 145m, "count", DateTime.Now.AddDays(-4)),
                new("Volunteer Hours", 320.5m, "hours", DateTime.Now.AddDays(-3)),
                new("Total Tithes", 16500.00m, "USD", DateTime.Now.AddDays(-2)),
                new("Choir Attendance", 99.2m, "%", DateTime.Now.AddDays(-1)),
            };

            // Configuration for the report
            var config = new ReportConfig(
                Title: "Monthly Performance Report",
                IncludedSections: ["Metrics", "Summary", "Trends"],
                IncludeTimestamp: true,
                IncludeSummary: true
            );

            // Dependency Injection: Create generator with console formatter
            var consoleFormatter = new ConsoleReportFormatter();
            var generator = new AdvancedReportGenerator(consoleFormatter, config);

            // Generate report asynchronously
            var consoleReport = await generator.GenerateAsync(sampleMetrics);
            Console.WriteLine(consoleReport);

            // Demonstrate LINQ analytics
            Console.WriteLine("\n=== Metric Analytics ===");
            var topPerformers = MetricAnalyzer.FindTopPerformers(sampleMetrics, 3);
            Console.WriteLine("Top 3 Metrics:");
            foreach (var performer in topPerformers)
            {
                Console.WriteLine($"  • {performer}");
            }

            var growthRate = MetricAnalyzer.CalculateGrowthRate(
                sampleMetrics.Where(m => m.Name == "Total Tithes")
            );
            Console.WriteLine($"\nTithes Growth Rate: {growthRate:N2}%");

            // Demonstrate batch generation with multiple formatters
            Console.WriteLine("\n=== Batch Report Generation ===");
            var batchReports = await AdvancedReportGenerator.GenerateBatchAsync(
                sampleMetrics,
                new ConsoleReportFormatter(),
                new JsonReportFormatter()
            );

            Console.WriteLine($"Generated {batchReports.Length} reports in parallel");

            // Save JSON report to file
            if (batchReports.Length > 1)
            {
                var jsonGenerator = new AdvancedReportGenerator(
                    new JsonReportFormatter(),
                    config
                );
                await jsonGenerator.SaveToFileAsync(
                    batchReports[1],
                    "monthly_report.json"
                );
            }

            Console.WriteLine("\n✓ All operations completed successfully");
        }
    }
}
