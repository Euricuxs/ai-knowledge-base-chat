namespace Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<ChatSession> ChatSessions { get; set; } = new List<ChatSession>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}