{ sources ? import ./nix/sources.nix }:
let
  pkgs =
    let
      niv-overlay = _: pkgs: { niv = import sources.niv {}; };
      moz-overlay = import sources.nixpkgs-mozilla;
    in
      import sources.nixpkgs { overlays = [ niv-overlay moz-overlay ] ; config = {}; };
in
  pkgs.mkShell {
    buildInputs = [
      pkgs.nodejs-14_x
      (pkgs.latest.rustChannels.stable.rust.override {
        targets = ["wasm32-unknown-unknown"];
      })
      pkgs.cargo
      pkgs.wasm-pack
      pkgs.wabt # WebAssembly Toolkit

      # keep this line if you use bash
      pkgs.bashInteractive
    ];
  }
