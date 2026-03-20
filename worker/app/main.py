import argparse
from pprint import pprint

from app.jobs.runner import run_forever_safe, run_once_safe
from app.jobs.static_gtfs import run_static_import_safe


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", nargs="?", default="live", choices=["live", "static", "full", "daemon"])
    args = parser.parse_args()

    if args.command == "static":
        pprint(run_static_import_safe())
        return
    if args.command == "full":
        pprint(run_static_import_safe())
        pprint(run_once_safe())
        return
    if args.command == "daemon":
        run_forever_safe()
        return
    pprint(run_once_safe())


if __name__ == "__main__":
    main()
