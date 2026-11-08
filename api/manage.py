"""Run: python -m api.manage create-user USERNAME (password prompted)."""
import argparse
import getpass
import os
from .db import DB
from .main import create_user

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['migrate', 'create-user'])
    parser.add_argument('username', nargs='?')
    args = parser.parse_args()
    db = DB(os.environ.get('DATABASE_URL', 'sqlite:////tmp/phei-dev.sqlite3'))
    db.migrate()
    if args.command == 'create-user':
        if not args.username:
            parser.error('Se requiere nombre de usuario')
        password = getpass.getpass('Contraseña (mínimo 12 caracteres): ')
        if password != getpass.getpass('Repite contraseña: '):
            parser.error('Contraseñas no coinciden')
        create_user(db, args.username.lower(), password)
        print('Usuario creado')
