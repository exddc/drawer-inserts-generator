# Box Grid Generator

Simple parameterized generator to create a grid of boxes for 3D printing. The grid is generated in a way that the boxes are connected to each other, so that they can be printed as a single object or as a set of separate objects.

[![](https://static.timoweiss.me/box-generator-browser-screenshot.png)](https://box-grid.timoweiss.me)

Play with it here: [box-grid.timoweiss.me](https://box-grid.timoweiss.me)

## Printable exports

- **STL print plate** exports every visible box as a binary STL and places 5 mm
  between parts. Each part is a closed manifold shell, so adjacent drawer boxes
  do not introduce coincident faces in the file.
- **3MF** exports the same deterministic print-plate layout in millimeters while
  preserving each box as a separate object.
- **Separate STL ZIP** exports one binary STL per unique design. Identical
  designs are counted by generated mesh shape (including rotated equivalents),
  while different non-rectangular shapes with the same bounding dimensions stay
  separate.

Bottomed boxes are generated as one stitched solid rather than overlapping wall
and bottom meshes. Bottomless boxes are closed wall shells. Display helpers,
selection state, colors, and camera state are not part of any export.

Exports support up to 2,500 grid cells, 250 visible parts, and a 32 MB finished
artifact. Geometry and compression run in a cancellable worker so the editor
remains responsive; the supported limit is stress-tested against a 128 MB worker
heap-growth budget. Excess models are rejected with an actionable message before
mesh generation, and hidden boxes are filtered before geometry is materialized.

## Getting Started

First, run the development server:

```bash
npm install
npm run dev

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

You can either deploy the app to Vercel or any other provider that supports Next.js apps. Or you can deploy the app on your own server by running the following command:

```bash
npm run build
npm run start
```

Further configuration is required to deploy the app to a production environment on your own server. You can find more information on your provider's website.

## Contributing

If you would like to contribute to the project, you can do so by submitting a pull request. You can also open an issue if you have any questions or suggestions.

Before you submit a pull request, please make sure that your changes are in line with the project's goals and coding style. You should also make sure that your changes are well tested and documented.

Another way to contribute is by opening an issue. You can open an issue to report a bug or to request a new feature.

## License

This project is open source and available under the MIT License. See the LICENSE file for more details.
