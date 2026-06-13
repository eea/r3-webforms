namespace Api.Configuration;

public class LockOptions
{
    public int DefaultTtlHours { get; set; } = 8;
    public int HeartbeatTimeoutMinutes { get; set; } = 5;
}
