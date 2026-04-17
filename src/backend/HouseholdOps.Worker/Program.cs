using HouseholdOps.Infrastructure;
using HouseholdOps.Modules.Administration;
using HouseholdOps.Modules.Chores;
using HouseholdOps.Modules.Display;
using HouseholdOps.Modules.Households;
using HouseholdOps.Modules.Identity;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Notifications;
using HouseholdOps.Modules.Scheduling;
using HouseholdOps.Worker;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddHouseholdOpsPersistence(builder.Configuration);
builder.Services.AddHouseholdsModule();
builder.Services.AddIdentityModule();
builder.Services.AddIntegrationsModule();
builder.Services.AddNotificationsModule();
builder.Services.AddSchedulingModule();
builder.Services.AddDisplayModule();
builder.Services.AddAdministrationModule();
builder.Services.AddChoresModule();
builder.Services.AddHostedService<WorkerHeartbeatService>();
builder.Services.AddHostedService<GoogleCalendarSyncWorker>();
builder.Services.AddHostedService<EventReminderWorker>();
builder.Services.AddHostedService<ChoreInstanceGeneratorWorker>();

var host = builder.Build();
host.Run();
