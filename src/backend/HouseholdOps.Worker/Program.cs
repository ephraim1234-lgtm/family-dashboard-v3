using HouseholdOps.Infrastructure;
using HouseholdOps.Modules.Administration;
using HouseholdOps.Modules.Display;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.Worker;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddHouseholdOpsPersistence(builder.Configuration);
builder.Services.AddHouseholdsModule();
builder.Services.AddIdentityModule();
builder.Services.AddSchedulingModule();
builder.Services.AddDisplayModule();
builder.Services.AddAdministrationModule();
builder.Services.AddHostedService<WorkerHeartbeatService>();

var host = builder.Build();
host.Run();
