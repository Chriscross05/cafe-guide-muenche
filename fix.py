import sys

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line numbers are 0-indexed in Python list. Line 461 is index 460.
lines[460] = "                        ${editorial ? '<p class=\"editorial\">' + editorial + '</p>' : ''}\n"

# Lines 462 to 468 (indices 461 to 467)
lines[461] = "                        ${reviewSnippet ? '<div class=\"reviews-section\">\\n' +\n"
lines[462] = "                                '                                <h3 class=\"reviews-title\">Was Besucher sagen</h3>\\n' +\n"
lines[463] = "                                '                                <div class=\"review\"><p>\"' + reviewSnippet + '\"</p></div>\\n' +\n"
lines[464] = "                                '                            </div>' : ''}\n"
lines[465] = ""  # deleted extra lines since it was multiple lines
lines[466] = ""
lines[467] = ""

with open('index.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Updated index.html programmatically")
