using System.Security.Claims;
using Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController : ControllerBase
{
    [HttpGet("me")]
    public ActionResult<UserDto> GetCurrentUser()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var firstName = User.FindFirst(ClaimTypes.GivenName)?.Value;
        var lastName = User.FindFirst(ClaimTypes.Surname)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        return Ok(new UserDto(
            Guid.Parse(userId),
            email ?? string.Empty,
            firstName ?? string.Empty,
            lastName ?? string.Empty,
            DateTime.UtcNow
        ));
    }
}