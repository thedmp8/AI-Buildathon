Blazor Server setup (recommended)

This project will be switched to use Blazor Server. Follow these steps locally to scaffold a working Blazor Server app and integrate the CSV data files already in `data/`.

1) Ensure you have the .NET SDK installed (6.0 or later).

Run:

dotnet --info

2) From the workspace root, create a Blazor Server app:

dotnet new blazorserver -o ANUPlanner
cd ANUPlanner

3) Add the CSV files to the new project. Copy the existing `data/courses.csv` and `data/degrees.csv` into the project folder (e.g., `ANUPlanner/Data/`).

4) Implement a simple data service to read CSV files. Example approach:
- Use `CsvHelper` NuGet package (`dotnet add package CsvHelper`) or implement a tiny parser.
- Provide methods like `Task<IEnumerable<Course>> GetCoursesAsync()` and `Task<IEnumerable<Degree>> GetDegreesAsync()`.

5) Build a Blazor page `Pages/Planner.razor` exposing:
- Start date input and degree selector (bound to `GetDegreesAsync()`)
- Course list loaded from `GetCoursesAsync()` filtered by selected term
- Course selection UI that checks `offerings` and `prerequisites` (can call service methods)
- A final "Validate plan" button that runs graduation requirement checks.

6) Run the app:

dotnet run --project ANUPlanner
# open https://localhost:5001

Notes on CSV format
- `data/courses.csv` fields: `code,title,credits,offerings,prerequisites` where `offerings` and `prerequisites` use `|` as a separator.
- `data/degrees.csv` fields: `id,name,requiredCredits,coreCourses` where `coreCourses` uses `|` as a separator.

If you want, I can scaffold a sample `ANUPlanner` Blazor project structure in this repo (creating project files and example pages). Tell me if you want me to generate the project files here.
