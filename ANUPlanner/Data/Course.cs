namespace ANUPlanner.Data
{
    public class Course
    {
        public string Code { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int Credits { get; set; }
        public List<string> Offerings { get; set; } = new();
        public List<string> Prerequisites { get; set; } = new();
    }
}
