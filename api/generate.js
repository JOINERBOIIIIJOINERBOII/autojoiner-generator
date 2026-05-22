export default async function handler(req, res) {
    // Allow anyone to use this API (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Use POST method' });
    }
    
    const { webhook, gameId, interval } = req.body;
    
    if (!webhook || !webhook.includes('discord.com/api/webhooks/')) {
        return res.status(400).json({ error: 'Invalid Discord webhook' });
    }
    
    try {
        // Create the Roblox script
        const script = generateScript(webhook, gameId || '142823291', interval || '5');
        
        // Upload to Pastefy (free paste service)
        const pastefyResponse = await fetch('https://pastefy.app/api/v2/paste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: script,
                title: `AutoJoiner_${Date.now()}`,
                visibility: 'UNLISTED'
            })
        });
        
        const pasteData = await pastefyResponse.json();
        const rawUrl = `https://pastefy.app/${pasteData.id}/raw`;
        
        return res.status(200).json({
            success: true,
            loadstring: `loadstring(game:HttpGet("${rawUrl}"))()`,
            rawUrl: rawUrl
        });
        
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

function generateScript(webhook, gameId, interval) {
    return `-- AUTO-JOINER SCRIPT
local WEBHOOK = "${webhook}"
local TARGET_GAME = ${gameId}
local CHECK_INTERVAL = ${interval}

local request = request or http_request or (syn and syn.request) or 
    (http and http.request) or (fluxus and fluxus.request) or
    (krnl and krnl.request) or (KRNL and KRNL.request)

if not request then
    warn("No HTTP request function found")
    return
end

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local TeleportService = game:GetService("TeleportService")
local plr = Players.LocalPlayer

local function sendToDiscord(message)
    local data = {
        content = message,
        embeds = {{
            title = "Auto-Joiner",
            description = "Status update",
            color = 0x5865F2,
            fields = {
                {name = "Server", value = game.JobId, inline = true},
                {name = "Player", value = plr.Name, inline = true}
            }
        }}
    }
    
    pcall(function()
        request({
            Url = WEBHOOK,
            Method = "POST",
            Headers = {["Content-Type"] = "application/json"},
            Body = HttpService:JSONEncode(data)
        })
    end)
end

print("[Auto-Joiner] Started!")
sendToDiscord("Auto-Joiner is running")

-- Simple auto-join loop
while true do
    -- Your server joining logic here
    -- This is a template - customize it
    
    task.wait(CHECK_INTERVAL)
end
`;
}
