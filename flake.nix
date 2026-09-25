{
  description = "Development environment for stego-ae";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_24
            prisma-engines
            pkg-config
            vips
            flac
            python3
            gnumake
            gcc
          ];

          shellHook = ''
            export npm_config_nodedir="${pkgs.nodejs_24}"
            export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"
            export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING="1"
            echo "stego-ae dev shell: Node $(node --version), npm $(npm --version)"
          '';
        };
      });
}
