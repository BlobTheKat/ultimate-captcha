export function Captcha(challenge){
	const t0 = performance.now()
	const canvas = document.createElement('canvas')
	const gl = canvas.getContext('webgl2')
	canvas.addEventListener('webglcontextlost', e => alert('webgl lost'))
	const tex = gl.createTexture()
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex)
	gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA32UI, 256, 256, 256)
	const heap = new Uint32Array(1<<26)
	let xsh = 9999
	for(let i = 0; i < (1<<26); i++){
		heap[i] = xsh;
		xsh ^= xsh << 13;
		xsh ^= xsh >>> 17;
		xsh ^= xsh << 5;
	}
	gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, 256, 256, 256, gl.RGBA_INTEGER, gl.UNSIGNED_INT, heap)
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
	const v = gl.createShader(gl.VERTEX_SHADER), f = gl.createShader(gl.FRAGMENT_SHADER)
	const p = gl.createProgram()
	gl.shaderSource(v, `#version 300 es\nvoid main(){gl_Position=vec4(float(gl_VertexID-1)*2.0625,float((gl_VertexID<<2&4)-1),0.,1.);}`)
	gl.compileShader(v)
	gl.shaderSource(f, `#version 300 es
precision highp int; precision highp usampler2DArray; precision highp usampler2D;
uniform usampler2DArray heap;
uniform usampler2D last;
out uvec2 ret;
void kernel(inout uvec2);
void main(){
	ret = texelFetch(last, ivec2(gl_FragCoord.xy), 0).xy;
	kernel(ret);
}
void kernel(inout uvec2 state){
	uint id = state.y;
	for(int i=0;i<4096;i++){
		id = texelFetch(heap, ivec3(id>>2&255u, id>>10&255u, id>>18&255u), 0)[id&3u];
		state.x ^= id;
	}
	state.y = id;
}`)
	gl.compileShader(f)
	let err = gl.getShaderInfoLog(f)
	if(err) console.warn(err)
	gl.attachShader(p, v); gl.attachShader(p, f)
	gl.linkProgram(p)
	err = gl.getProgramInfoLog(p)
	if(err) console.warn(err)
	gl.useProgram(p)
	gl.uniform1i(gl.getUniformLocation(p, 'last'), 1)
	const res = new Uint32Array(512)
	for(let i = 0; i < 256; i++) res[i<<1|1] = i
	const fb = gl.createFramebuffer(), p1 = gl.createTexture(), p2 = gl.createTexture()
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
	gl.activeTexture(gl.TEXTURE1)
	gl.bindTexture(gl.TEXTURE_2D, p1)
	gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG32UI, 16, 16)
	gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 16, 16, gl.RG_INTEGER, gl.UNSIGNED_INT, res)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
	gl.bindTexture(gl.TEXTURE_2D, p2)
	gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG32UI, 16, 16)
	gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 16, 16, gl.RG_INTEGER, gl.UNSIGNED_INT, res)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
	gl.viewport(0, 0, 16, 16)
	document.body.textContent = `Captcha ready! (took ${(performance.now() - t0).toFixed(2)}ms)\n\n`
	const t1 = performance.now()
	const ROUNDS = 256
	for(let i = 0; i < ROUNDS; i++){
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, i&1?p2:p1, 0)
		gl.bindTexture(gl.TEXTURE_2D, i&1?p1:p2)
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3)
	}
	gl.readPixels(0, 0, 16, 16, gl.RG_INTEGER, gl.UNSIGNED_INT, res)
	let acc = 0
	for(let i=0;i<256;i++) acc += res[i<<1]
	document.body.textContent += `Captcha completed in ${(performance.now() - t1).toFixed(2)}ms\nhash: ${(acc>>>0).toString(16).padStart(8, '0')}`
}
export default Captcha