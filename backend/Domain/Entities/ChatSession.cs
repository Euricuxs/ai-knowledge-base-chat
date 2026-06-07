namespace Domain.Entities;

public class ChatSession
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsArchived { get; set; }

    public User User { get; set; } = null!;
    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}