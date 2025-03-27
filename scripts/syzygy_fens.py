#!/usr/bin/env python3
import sys
import json
import chess
import chess.syzygy

# read FENs newline-separated from stdin and output WDL and DTZ results as JSON
def main():
    if len(sys.argv) < 2:
        print("Usage: {} <tablebase_directory>".format(sys.argv[0]))
        sys.exit(1)

    tablebase_dir = sys.argv[1]

    # Open the tablebase files.
    with chess.syzygy.open_tablebase(tablebase_dir) as tablebase:
        # Process each line (FEN) from stdin.
        for line in sys.stdin:
            fen = line.strip()
            if not fen:
                continue  # Skip empty lines.
            result = {"fen": fen}
            try:
                board = chess.Board(fen)
            except ValueError as e:
                result["error"] = f"Invalid FEN: {e}"
                print(json.dumps(result))
                sys.stdout.flush()
                continue

            try:
                result["wdl"] = tablebase.probe_wdl(board)
                result["dtz"] = tablebase.probe_dtz(board)
            except chess.syzygy.MissingTableError as e:
                result["error"] = f"Missing table: {e}"
            except Exception as e:
                result["error"] = f"Probe error: {e}"

            print(json.dumps(result))
            sys.stdout.flush()

if __name__ == '__main__':
    main()