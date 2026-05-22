export default async function handler(req, res) {
    // Allow anyone to use this API
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
        // Generate the script content
        const script = generateScript(webhook, gameId || '142823291', interval || '5');
        
        // Try multiple paste services (if one fails, try another)
        let rawUrl = null;
        let errorMessage = null;
        
        // Attempt 1: Pastefy
        try {
            const pastefyResponse = await fetch('https://pastefy.app/api/v2/paste', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: script,
                    title: `AutoJoiner_${Date.now()}`,
                    visibility: 'UNLISTED'
                })
            });
            
            if (pastefyResponse.ok) {
                const pasteData = await pastefyResponse.json();
                // Fixed: Properly extract the ID
                const pasteId = pasteData.id || pasteData._id;
                if (pasteId && pasteId !== 'undefined') {
                    rawUrl = `https://pastefy.app/${pasteId}/raw`;
                } else {
                    throw new Error('Invalid paste ID');
                }
            } else {
                throw new Error('Pastefy returned error');
            }
        } catch (e) {
            errorMessage = e.message;
            console.log('Pastefy failed, trying Rentry...');
            
            // Attempt 2: Rentry.co (alternative)
            try {
                const rentryResponse = await fetch('https://rentry.co/api/new', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: script,
                        edit_code: Math.random().toString(36).substring(7)
                    })
                });
                
                if (rentryResponse.ok) {
                    const rentryData = await rentryResponse.json();
                    if (rentryData.url) {
                        rawUrl = rentryData.url + '/raw';
                    } else {
                        throw new Error('Invalid Rentry response');
                    }
                } else {
                    throw new Error('Rentry failed');
                }
            } catch (e2) {
                errorMessage = e2.message;
                console.log('Rentry failed, trying Pastebin...');
                
                // Attempt 3: Pastebin (requires API key - limited)
                // For now, return the script directly (last resort)
                return res.status(200).json({
                    success: true,
                    loadstring: `-- Copy this entire script and paste it directly into your executor\n\n${script}`,
                    rawUrl: null,
                    note: "Paste services are down. Copy the script above manually."
                });
            }
        }
        
        if (rawUrl) {
            return res.status(200).json({
                success: true,
                loadstring: `loadstring(game:HttpGet("${rawUrl}"))()`,
                rawUrl: rawUrl
            });
        } else {
            throw new Error(errorMessage || 'All paste services failed');
        }
        
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Generation failed' 
        });
    }
}

function generateScript(webhook, gameId, interval) {
    return `-- AUTO-JOINER SCRIPT (Generated ${new Date().toISOString()})
-- Discord Webhook: ${webhook.substring(0, 50)}...

local WEBHOOK = "${webhook}"
local TARGET_GAME = ${gameId}
local CHECK_INTERVAL = ${interval}

-- Universal HTTP request function for all executors
local request
local executor = "Unknown"

-- Detect executor
if syn and syn.request then
    request = syn.request
    executor = "Synapse X"
elseif fluxus and fluxus.request then
    request = fluxus.request
    executor = "Fluxus"
elseif krnl and krnl.request then
    request = krnl.request
    executor = "Krnl"
elseif KRNL and KRNL.request then
    request = KRNL.request
    executor = "Krnl (alt)"
elseif http and http.request then
    request = http.request
    executor = "HTTP"
elseif request then
    request = request
    executor = "Generic"
else
    warn("[AutoJoiner] No HTTP request function found! Your executor may not be supported.")
    warn("[AutoJoiner] Supported: Synapse X, Krnl, Fluxus, ScriptWare, Hydrogen")
    return
end

print("[AutoJoiner] Loaded! Executor: " .. executor)
print("[AutoJoiner] Target Game: " .. TARGET_GAME)
print("[AutoJoiner] Check Interval: " .. CHECK_INTERVAL .. "s")

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local TeleportService = game:GetService("TeleportService")
local plr = Players.LocalPlayer
local running = true

-- Send message to Discord webhook
local function sendWebhook(content, title)
    local data = {
        username = "AutoJoiner Bot",
        avatar_url = "https://cdn.discordapp.com/icons/...",
        content = content,
        embeds = title and {{
            title = title,
            description = "Status: " .. (content or "Active"),
            color = 0x5865F2,
            fields = {
                {name = "Server", value = game.JobId, inline = true},
                {name = "Player", value = plr.Name, inline = true},
                {name = "Executor", value = executor, inline = true},
                {name = "Game", value = tostring(game.PlaceId), inline = true}
            },
            footer = {text = "AutoJoiner System"},
            timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ")
        }}
    }
    
    local success, err = pcall(function()
        local response = request({
            Url = WEBHOOK,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = HttpService:JSONEncode(data)
        })
        return response
    end)
    
    if not success then
        warn("[AutoJoiner] Failed to send webhook: " .. tostring(err))
    end
end

-- Send startup notification
sendWebhook("AutoJoiner started! Monitoring for servers...", "🚀 Started")

-- Function to get target server (CUSTOMIZE THIS!)
-- OPTION 1: Read from a Discord channel (requires bot token)
-- OPTION 2: Read from a pastebin URL
-- OPTION 3: Hardcoded server IDs
local function getTargetServer()
    -- EXAMPLE: Hardcoded server ID (replace with your target)
    -- return { jobId = "00000000-0000-0000-0000-000000000000" }
    
    -- EXAMPLE: Read from a pastebin (replace with your paste ID)
    -- local response = request({Url = "https://pastebin.com/raw/ABC123", Method = "GET"})
    -- if response and response.Body then
    --     return { jobId = response.Body:gsub("%s+", "") }
    -- end
    
    -- DEFAULT: No target (you need to implement this)
    print("[AutoJoiner] No target server configured. Set up getTargetServer() function.")
    return nil
end

-- Main loop
local function main()
    print("[AutoJoiner] Starting main loop...")
    
    while running do
        -- Check if we're in the target game
        if game.PlaceId == TARGET_GAME then
            print("[AutoJoiner] Currently in target game! Server: " .. game.JobId)
            sendWebhook("Currently in: " .. game.JobId, "📍 In Target Game")
            
            -- Wait and then leave after 60 seconds (to prevent loops)
            task.wait(60)
            print("[AutoJoiner] Leaving target game to find more...")
            sendWebhook("Leaving to find more servers...", "🔄 Cycling")
            pcall(function()
                TeleportService:Teleport(TARGET_GAME) -- Rejoin lobby
            end)
            task.wait(10)
        else
            -- Look for target server
            local target = getTargetServer()
            
            if target and target.jobId and target.jobId ~= "" then
                print("[AutoJoiner] Found target server: " .. target.jobId)
                sendWebhook("Joining server: " .. target.jobId, "🎯 Target Found")
                
                -- Join the target server
                local success, err = pcall(function()
                    TeleportService:TeleportToPlaceInstance(TARGET_GAME, target.jobId, plr)
                end)
                
                if success then
                    print("[AutoJoiner] Teleport initiated!")
                    running = false -- Stop loop, script will restart in new server
                else
                    warn("[AutoJoiner] Teleport failed: " .. tostring(err))
                    sendWebhook("Failed to join: " .. tostring(err), "❌ Error")
                end
            else
                print("[AutoJoiner] No target server found. Waiting " .. CHECK_INTERVAL .. "s...")
            end
        end
        
        task.wait(CHECK_INTERVAL)
    end
end

-- Run the script
local success, err = pcall(main)
if not success then
    warn("[AutoJoiner] Script error: " .. tostring(err))
    sendWebhook("Error: " .. tostring(err), "⚠️ Script Error")
end

print("[AutoJoiner] Script ended.")
`;
    }
