"""
Makes public/install/ThePowerHouse.mobileconfig: an iPhone "configuration
profile" that adds The Power House to the Home Screen (a full-screen web app),
as another way to install it than Safari's Share menu.

    python scripts/make-install-profile.py
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'https://thepowerhouseintl.vercel.app/'
icon = base64.encodebytes((ROOT / 'public/icons/apple-touch-icon.png').read_bytes()).decode().strip()

profile = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>FullScreen</key>
			<true/>
			<key>Icon</key>
			<data>
{icon}
			</data>
			<key>IgnoreManifestScope</key>
			<false/>
			<key>IsRemovable</key>
			<true/>
			<key>Label</key>
			<string>The Power House</string>
			<key>Precomposed</key>
			<true/>
			<key>URL</key>
			<string>{URL}</string>
			<key>PayloadDisplayName</key>
			<string>The Power House</string>
			<key>PayloadIdentifier</key>
			<string>app.thepowerhouseintl.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>6F1E0C2A-3B7D-4C5E-9A8F-2D1B0E4C7A91</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>PayloadDescription</key>
	<string>Adds The Power House app to your Home Screen. It opens full screen, like any other app. You can remove it at any time.</string>
	<key>PayloadDisplayName</key>
	<string>The Power House</string>
	<key>PayloadIdentifier</key>
	<string>app.thepowerhouseintl.install</string>
	<key>PayloadOrganization</key>
	<string>The Power House International</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>B3C9D7E1-5A2F-4E68-8C14-7F0A3D9E2B56</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>
"""
out = ROOT / 'public/install/ThePowerHouse.mobileconfig'
out.write_text(profile, encoding='utf-8', newline='\n')
print('wrote', out.relative_to(ROOT), len(profile), 'bytes')
