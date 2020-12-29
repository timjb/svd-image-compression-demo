{ sources ? import ./nix/sources.nix }:
let
  pkgs =
    with
      { overlay = _: pkgs:
          { niv = import sources.niv {};
          };
      };
    import sources.nixpkgs { overlays = [ overlay ] ; config = {}; };
in
  pkgs.mkShell {
    buildInputs = [
      pkgs.nodejs-14_x

      # keep this line if you use bash
      pkgs.bashInteractive
    ];
  }
