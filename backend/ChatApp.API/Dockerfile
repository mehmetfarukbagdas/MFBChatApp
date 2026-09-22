FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

COPY ["backend/ChatApp.API/ChatApp.API.csproj", "backend/ChatApp.API/"]
COPY ["backend/ChatApp.Application/ChatApp.Application.csproj", "backend/ChatApp.Application/"]
COPY ["backend/ChatApp.Domain/ChatApp.Domain.csproj", "backend/ChatApp.Domain/"]
COPY ["backend/ChatApp.Infrastructure/ChatApp.Infrastructure.csproj", "backend/ChatApp.Infrastructure/"]

RUN dotnet restore "backend/ChatApp.API/ChatApp.API.csproj"

COPY . .

WORKDIR "/src/backend/ChatApp.API"

RUN dotnet publish "ChatApp.API.csproj" -c Release -o /app/publish /p:UseAppHost=false


FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "ChatApp.API.dll"]