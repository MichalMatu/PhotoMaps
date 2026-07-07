from io import BytesIO

from PIL import Image


def image_upload(filename: str = "upload.jpg") -> tuple[str, BytesIO, str]:
    buffer = BytesIO()
    image = Image.new("RGB", (16, 16), (18, 106, 90))
    image.save(buffer, format="JPEG", exif=b"example-exif")
    buffer.seek(0)
    return filename, buffer, "image/jpeg"


def audio_upload(
    filename: str = "clip.mp3",
    content: bytes = b"test-audio",
    content_type: str = "audio/mpeg",
) -> tuple[str, BytesIO, str]:
    return filename, BytesIO(content), content_type


def detailed_image_upload(filename: str = "upload.jpg") -> tuple[str, BytesIO, str]:
    buffer = BytesIO()
    image = Image.new("RGB", (32, 32), (240, 240, 240))
    for y_value in range(32):
        for x_value in range(32):
            color = (20, 20, 20) if ((x_value // 4) + (y_value // 4)) % 2 == 0 else (230, 230, 230)
            image.putpixel((x_value, y_value), color)
    image.save(buffer, format="JPEG", exif=b"example-exif")
    buffer.seek(0)
    return filename, buffer, "image/jpeg"


def png_upload(filename: str = "upload.png") -> tuple[str, BytesIO, str]:
    buffer = BytesIO()
    image = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for x in range(4, 12):
        for y in range(4, 12):
            image.putpixel((x, y), (180, 64, 32, 180))
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return filename, buffer, "image/png"
