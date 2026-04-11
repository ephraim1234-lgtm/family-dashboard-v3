using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HouseholdOps.Infrastructure.Persistence;

public sealed class HouseholdOpsDbContextFactory : IDesignTimeDbContextFactory<HouseholdOpsDbContext>
{
    public HouseholdOpsDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("HOUSEHOLDOPS_DB")
            ?? "Host=localhost;Port=5432;Database=householdops_dev;Username=householdops;Password=householdops";

        var optionsBuilder = new DbContextOptionsBuilder<HouseholdOpsDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new HouseholdOpsDbContext(optionsBuilder.Options);
    }
}
