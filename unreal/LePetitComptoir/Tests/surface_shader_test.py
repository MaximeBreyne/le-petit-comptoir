"""Optional Linux HLSL syntax/type check with libshaderc (not Unreal/DX12 QA).

Promote the local helper struct to file scope for glslang: its HLSL frontend
crashes on nested structs with methods. Unreal's Custom expression keeps it local.
Run -VerifyGraphics on Windows to check the real generated material graph.
"""
import ctypes as C
from pathlib import Path

lib = C.CDLL('libshaderc.so.1')
for name, args, result in [
    ('shaderc_compiler_initialize', [], C.c_void_p),
    ('shaderc_compile_options_initialize', [], C.c_void_p),
    ('shaderc_compile_options_set_source_language', [C.c_void_p, C.c_int], None),
    ('shaderc_compile_into_spv', [C.c_void_p, C.c_char_p, C.c_size_t, C.c_int, C.c_char_p, C.c_char_p, C.c_void_p], C.c_void_p),
    ('shaderc_result_get_compilation_status', [C.c_void_p], C.c_int),
    ('shaderc_result_get_error_message', [C.c_void_p], C.c_char_p),
    ('shaderc_result_release', [C.c_void_p], None),
    ('shaderc_compile_options_release', [C.c_void_p], None),
    ('shaderc_compiler_release', [C.c_void_p], None),
]:
    function = getattr(lib, name)
    function.argtypes, function.restype = args, result
compiler = lib.shaderc_compiler_initialize()
options = lib.shaderc_compile_options_initialize()
if not compiler or not options:
    raise RuntimeError('Cannot initialize shaderc')
try:
    lib.shaderc_compile_options_set_source_language(options, 1)  # shaderc_source_language_hlsl
    shader = (Path(__file__).resolve().parents[1] / 'Scripts/original_surface.hlsl').read_text()
    header, body = shader.split('ComptoirSurface s;', 1)
    for index in range(17):
        source = (header + '\nfloat3 surface(float4 Tint,float3 World,float3 Normal,float2 UV,float3 View,float BaseRoughness,'
                  'out float Roughness,out float3 DetailNormal,out float Occlusion,out float GlassOpacity,out float Metallic){\n'
                  + f'const int Surface={index};\nComptoirSurface s;' + body + '\n}\n'
                  'float4 main(float2 uv:TEXCOORD0,float3 p:TEXCOORD1,float3 n:TEXCOORD2,float4 tint:COLOR0):SV_Target {'
                  'float r,a,o,m;float3 N;float3 c=surface(tint,p,n,uv,float3(0,0,1),.5,r,N,o,a,m);'
                  'return float4(c*o+r*.01+N*.01+m*.01,a);}\n').encode()
        result = lib.shaderc_compile_into_spv(compiler, source, len(source), 1, b'Comptoir.hlsl', b'main', options)
        if not result:
            raise RuntimeError('No shader compiler result')
        try:
            status = lib.shaderc_result_get_compilation_status(result)
            if status:
                raise RuntimeError(f'Material {index}: {lib.shaderc_result_get_error_message(result).decode()}')
        finally:
            lib.shaderc_result_release(result)
    print('PASS: all 17 surface shaders compile with the standalone HLSL frontend.')
finally:
    lib.shaderc_compile_options_release(options)
    lib.shaderc_compiler_release(compiler)
