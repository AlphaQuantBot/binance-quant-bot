import os
import zipfile

EXCLUDE_DIRS = {'node_modules', 'dist', 'backups', '.aistudio', '.git'}
EXCLUDE_FILES = {'.server_credentials.json'}

def make_zip(source_dir, output_zip):
    print(f"Creating zip backup: {output_zip}...")
    file_count = 0
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            # Avoid scanning inside public/backups
            rel_root = os.path.relpath(root, source_dir)
            if rel_root.startswith('public/backups') or rel_root.startswith('public\\backups'):
                continue

            for file in files:
                if file in EXCLUDE_FILES:
                    continue
                full_path = os.path.join(root, file)
                archive_name = os.path.relpath(full_path, source_dir)
                zipf.write(full_path, archive_name)
                file_count += 1
    print(f"Successfully archived {file_count} files into {output_zip}")

if __name__ == '__main__':
    base_dir = os.path.abspath('.')
    os.makedirs('backups', exist_ok=True)
    os.makedirs('public/backups', exist_ok=True)
    
    zip_path = 'backups/binance_quant_ai_scalper_backup_latest.zip'
    make_zip(base_dir, zip_path)
    
    # Also save a timestamped copy and a public downloadable copy
    import shutil
    shutil.copyfile(zip_path, 'backups/binance_quant_ai_scalper_backup_20261023.zip')
    shutil.copyfile(zip_path, 'public/backups/binance_quant_ai_scalper_backup_latest.zip')
    print("All zip backups successfully created.")
