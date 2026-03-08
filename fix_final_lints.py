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

# 1. api/alerts/sip-reminders/route.ts (any casts)
replace_in_file(r'src/app/api/alerts/sip-reminders/route.ts', [
    (r'\(s: any\)', r'(s: Record<string, any>)'),
    (r'\(a: any\)', r'(a: Record<string, any>)'),
    (r'as any\[\]', r'as Record<string, any>[]'),
])

# 2. api/cron/process-sips/route.ts (Function casts)
replace_in_file(r'src/app/api/cron/process-sips/route.ts', [
    (r'\{ update: Function \}', r'{ update: (data: unknown) => { eq: (k: string, v: string | number) => Promise<unknown> } }'),
    (r'\{ insert: Function \}', r'{ insert: (data: unknown) => Promise<unknown> }'),
])

# 3. login/page.tsx (router)
replace_in_file(r'src/app/login/page.tsx', [
    (r'\s*const router = useRouter\(\);\n', r'\n')
])

# 4. clients/page.tsx (formatNAV)
replace_in_file(r'src/app/clients/page.tsx', [
    (r'function formatNAV\(amount: number\): string \{[\s\n]*return `₹\$\{amount\.toFixed\(2\)\}`;[\s\n]*\}', r'')
])

print("Done")
