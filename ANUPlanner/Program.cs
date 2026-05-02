using ANUPlanner.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor();
builder.Services.AddSingleton<CsvDataService>();

// Configure Kestrel to allow immediate port reuse
builder.WebHost.UseKestrel(options =>
{
    options.ListenLocalhost(5000);
    options.ListenLocalhost(5001, listenOptions => listenOptions.UseHttps());
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

// Ensure graceful shutdown
var lifetime = app.Services.GetRequiredService<IHostApplicationLifetime>();
lifetime.ApplicationStopping.Register(async () =>
{
    Console.WriteLine("Application is shutting down...");
    await Task.Delay(100); // Allow final cleanup
});

await app.RunAsync();
