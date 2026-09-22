using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/health")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() =>
        Ok(new
        {
            status = "ok",
            service = "ChatApp.API"
        });
}