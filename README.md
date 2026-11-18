### Build Dockerfile
podman build -t local_nginx:latest .

### local testing
- npx vitest --browser=chromium
  - browser options
    - chrome
    - edge
    - safari

#### supported version
####     Chrome >=87
####        Firefox >=78
####        Safari >=15.4
####        Edge >=88
#### cli command to turn off display of web browser / the web browser will not appear on screen
npx vitest --browser.headless


## License
This project is licensed under the GNU General Public License v3.0 or later. See [LICENSE](LICENSE) for the full license text.

Public, educational, community, and open source projects are welcome. Because this project uses the GPL, redistribution of this project or modified versions must preserve the same GPL freedoms and source-code rights for recipients.

