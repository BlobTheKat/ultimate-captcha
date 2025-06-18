export function Captcha(challenge){
	const t0 = performance.now()
	const canvas = document.createElement('canvas')
	const gl = canvas.getContext('webgl2')
	const tex = gl.createTexture()
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex)
	gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA32UI, 256, 256, 256)
	const buf = new Uint32Array(1<<26)
	for(let i = buf.length; (i-=16384) >= 0;)
		crypto.getRandomValues(buf.subarray(i, i+16384))
	gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, 256, 256, 256, gl.RGBA_INTEGER, gl.UNSIGNED_INT, buf)
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
	const v = gl.createShader(gl.VERTEX_SHADER), f = gl.createShader(gl.FRAGMENT_SHADER)
	const p = gl.createProgram()
	gl.shaderSource(v, `#version 300 es\nvoid main(){gl_Position=vec4(float(gl_VertexID-1)*2.0625,float((gl_VertexID<<2&4)-1),0.,1.);}`)
	gl.compileShader(v)
	gl.shaderSource(f, `#version 300 es
precision highp int; precision highp usampler2DArray;
uniform usampler2DArray heap;
uniform int iters;
out uint ret;
uint kernel(uint);
void main(){ ret = kernel(uint(gl_FragCoord.x)|uint(gl_FragCoord.y)<<4); }
uint kernel(uint id){
	uint ret = 0u;
	for(int i=0;i<65536;i++){
		id = texelFetch(heap, ivec3(id>>2&255u, id>>10&255u, id>>18&255u), 0)[id&3u];
		ret ^= id;
	}
	return ret;
}`)
	gl.compileShader(f)
	let err = gl.getShaderInfoLog(f)
	if(err) console.warn(err)
	gl.attachShader(p, v); gl.attachShader(p, f)
	gl.linkProgram(p)
	err = gl.getProgramInfoLog(p)
	if(err) console.warn(err)
	gl.useProgram(p)
	const fb = gl.createFramebuffer(), rb = gl.createRenderbuffer()
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
	gl.bindRenderbuffer(gl.RENDERBUFFER, rb)
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.R32UI, 16, 16)
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb)
	gl.viewport(0, 0, 16, 16)
	console.debug('Captcha ready! %sms', (performance.now() - t0).toFixed(2))
	const res = new Uint32Array(256)
	const t1 = performance.now()
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3)
	gl.readPixels(0, 0, 16, 16, gl.RED_INTEGER, gl.UNSIGNED_INT, res)
	let acc = 0
	for(const x of res) acc += x
	console.log('Captcha done in %sms\nhash: %s', performance.now() - t1, (acc>>>0).toString(16).padStart(8, '0'))
}
export default Captcha