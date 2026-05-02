namespace ANUPlanner.Data
{
    public class Degree
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int RequiredCredits { get; set; }
        public List<string> CoreCourses { get; set; } = new();
    }
}
