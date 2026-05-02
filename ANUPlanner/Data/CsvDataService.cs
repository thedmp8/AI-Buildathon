namespace ANUPlanner.Data
{
    public class CsvDataService
    {
        private readonly IWebHostEnvironment _env;

        public CsvDataService(IWebHostEnvironment env)
        {
            _env = env;
        }

        private string DataPath(string fileName)
        {
            return Path.Combine(_env.ContentRootPath, "Data", fileName);
        }

        private static string[] SplitSimple(string line)
        {
            return line.Split(',').Select(s => s.Trim().Trim('"')).ToArray();
        }

        public Task<List<Course>> GetCoursesAsync()
        {
            var p = DataPath("courses.csv");
            if (!File.Exists(p)) return Task.FromResult(new List<Course>());
            var lines = File.ReadAllLines(p).Where(l => !string.IsNullOrWhiteSpace(l)).ToArray();
            var list = new List<Course>();
            foreach (var line in lines.Skip(1))
            {
                var parts = SplitSimple(line);
                if (parts.Length < 4) continue;
                var c = new Course
                {
                    Code = parts[0],
                    Title = parts[1],
                    Credits = int.TryParse(parts[2], out var cr) ? cr : 0,
                    Offerings = (parts.Length > 3 && !string.IsNullOrWhiteSpace(parts[3])) ? parts[3].Split('|').Select(s => s.Trim()).Where(s => s != "").ToList() : new List<string>(),
                    Prerequisites = (parts.Length > 4 && !string.IsNullOrWhiteSpace(parts[4])) ? parts[4].Split('|').Select(s => s.Trim()).Where(s => s != "").ToList() : new List<string>()
                };
                list.Add(c);
            }
            return Task.FromResult(list);
        }

        public Task<List<Degree>> GetDegreesAsync()
        {
            var p = DataPath("degrees.csv");
            if (!File.Exists(p)) return Task.FromResult(new List<Degree>());
            var lines = File.ReadAllLines(p).Where(l => !string.IsNullOrWhiteSpace(l)).ToArray();
            var list = new List<Degree>();
            foreach (var line in lines.Skip(1))
            {
                var parts = SplitSimple(line);
                if (parts.Length < 3) continue;
                var d = new Degree
                {
                    Id = parts[0],
                    Name = parts[1],
                    RequiredCredits = int.TryParse(parts[2], out var rc) ? rc : 0,
                    CoreCourses = (parts.Length > 3 && !string.IsNullOrWhiteSpace(parts[3])) ? parts[3].Split('|').Select(s => s.Trim()).Where(s => s != "").ToList() : new List<string>()
                };
                list.Add(d);
            }
            return Task.FromResult(list);
        }
    }
}
