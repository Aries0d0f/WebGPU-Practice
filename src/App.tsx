import { createRef, useEffect, useState } from 'react';

import shaderCode from './shader.wgsl?raw';

import './App.css';

function App() {
  const canvasRef$ = createRef<HTMLCanvasElement>();
  const [GPU, setGPU] = useState<GPUDevice>();
  const [ctx, setCtx] = useState<GPUCanvasContext>();

  const GPUComputeCtx = (GPU: GPUDevice, ctx: GPUCanvasContext) => {
    ctx.configure({
      device: GPU,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied'
    });

    const shaderModule = GPU.createShaderModule({
      code: shaderCode
    });

    const vertices = new Float32Array([
      0,     0.6, 0, 1, // position  [x, y, z, w]
      1,       0, 0, 1, // color     [r, g, b, a]
      -0.5, -0.6, 0, 1, // position  [x, y, z, w]
      0,       1, 0, 1, // color     [r, g, b, a]
      0.5,  -0.6, 0, 1, // position  [x, y, z, w]
      0,       0, 1, 1  // color     [r, g, b, a]
    ]);

    const vertexBuffer = GPU.createBuffer({
      size: vertices.byteLength, // make it big enough to store vertices in
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    GPU.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

    const vertexBuffers = [
      {
        attributes: [
          {
            shaderLocation: 0, // position
            offset: 0,
            format: 'float32x4'
          },
          {
            shaderLocation: 1, // color
            offset: 16,
            format: 'float32x4'
          }
        ],
        arrayStride: 32,
        stepMode: 'vertex'
      }
    ] satisfies GPUVertexBufferLayout[];

    const pipelineDescriptor = {
      vertex: {
        module: shaderModule,
        entryPoint: 'vertex_main',
        buffers: vertexBuffers
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragment_main',
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat()
          }
        ]
      },
      primitive: {
        topology: 'triangle-list'
      },
      layout: 'auto'
    } satisfies GPURenderPipelineDescriptor;

    const renderPipeline = GPU.createRenderPipeline(pipelineDescriptor);

    const commandEncoder = GPU.createCommandEncoder();

    const clearColor = { r: 0.0, g: 0.0, b: 0.0, a: 0.0 };

    const renderPassDescriptor = {
      colorAttachments: [
        {
          clearValue: clearColor,
          loadOp: 'clear',
          storeOp: 'store',
          view: ctx.getCurrentTexture().createView()
        }
      ]
    } satisfies GPURenderPassDescriptor;

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(3);
    passEncoder.end();

    GPU.queue.submit([commandEncoder.finish()]);
  };

  useEffect(() => {
    navigator.gpu
      .requestAdapter()
      .then((adapter) => adapter?.requestDevice())
      .then((device) => setGPU(device));
  }, []);

  useEffect(() => {
    if (canvasRef$.current && canvasRef$.current.getContext('webgpu')) {
      canvasRef$.current.width = canvasRef$.current.clientWidth;
      canvasRef$.current.height = canvasRef$.current.clientHeight;

      setCtx(canvasRef$.current.getContext('webgpu')!);
    }
  }, [canvasRef$]);

  useEffect(() => {
    if (GPU && ctx) {
      GPUComputeCtx(GPU, ctx);
    }
  }, [GPU, ctx]);

  return (
    <>
      <canvas ref={canvasRef$} />
    </>
  );
}

export default App;
