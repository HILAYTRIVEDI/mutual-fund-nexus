import os
import re

def replace_in_file(filepath, patterns):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, not found")
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for p, r in patterns:
        new_content = re.sub(p, r, new_content)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed {filepath}')

contexts = 'src/context'
context_patterns = [
    (r'Promise<any>', r'Promise<unknown>'),
    (r'\(error as any\)', r'(error as { code?: string })'),
    (r'as any \)', r'as Record<string, unknown>)')
]

for file in os.listdir(contexts):
    if file.endswith('.tsx') or file.endswith('.ts'):
        replace_in_file(os.path.join(contexts, file), context_patterns)

api_files = [
    'src/app/api/alerts/sip-reminders/route.ts',
    'src/app/api/clients/create/route.ts',
    'src/app/settings/page.tsx'
]

api_patterns = [
    (r' as any\)', r' as Record<string, unknown>)'),
    (r' as any\]', r' as Record<string, unknown>]'),
    (r' as any\}', r' as Record<string, unknown>}'),
    (r': any ', r': Record<string, unknown> '),
    (r'\(error as any\)', r'(error as { message?: string })'),
    (r'as any;', r'as Record<string, unknown>;')
]

for f in api_files:
    replace_in_file(f, api_patterns)

# Fix portfolio/page.tsx user dependency
replace_in_file('src/app/portfolio/page.tsx', [(r'\}, \[holdings, user\]\);', r'}, [holdings]);')])
print("Done")
