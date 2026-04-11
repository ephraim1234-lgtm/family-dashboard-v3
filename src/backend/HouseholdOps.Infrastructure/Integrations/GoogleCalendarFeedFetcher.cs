using System.Net.Http.Headers;
using HouseholdOps.Modules.Integrations;

namespace HouseholdOps.Infrastructure.Integrations;

public interface IGoogleCalendarFeedFetcher
{
    Task<string> FetchAsync(
        string feedUrl,
        CancellationToken cancellationToken);
}

public sealed class GoogleCalendarFeedFetcher(HttpClient httpClient) : IGoogleCalendarFeedFetcher
{
    public async Task<string> FetchAsync(
        string feedUrl,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, feedUrl);
        request.Headers.Accept.Add(
            new MediaTypeWithQualityHeaderValue("text/calendar"));

        using var response = await httpClient.SendAsync(
            request,
            cancellationToken);

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(cancellationToken);
    }
}
