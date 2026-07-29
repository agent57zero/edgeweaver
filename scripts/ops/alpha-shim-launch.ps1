# Edgeweaver Alpha telegram shim launcher (ASCII only; D33/CR-3). Runs the local
# Bot-API shim that serves Alpha's getUpdates from the cloud journal and proxies all
# other calls. Started by the cutover choreography (plan section 10) and, once armed,
# by a logon task; the alpha watchdog gains a shim check at arming, not before.
$host.UI.RawUI.WindowTitle = 'EdgeweaverAlphaShim'
Set-Location 'C:\Users\agent\Project\Edgeweaver'
node scripts\ops\telegram-shim.mjs --being alpha --port 8471
