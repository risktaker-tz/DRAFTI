Add-Type -AssemblyName System.Drawing
foreach ($size in @(192,512)) {
 $bitmap = [System.Drawing.Bitmap]::new($size,$size)
 $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
 $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
 $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#7c4a24'))
 $light = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#e9d5a7'))
 $dark = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#191009'))
 $unit = $size / 8
 $graphics.FillRectangle($light,$unit,$unit,3*$unit,3*$unit)
 $graphics.FillRectangle($light,4*$unit,4*$unit,3*$unit,3*$unit)
 $graphics.FillEllipse($dark,4.5*$unit,1.5*$unit,2*$unit,2*$unit)
 $graphics.FillEllipse($light,1.5*$unit,4.5*$unit,2*$unit,2*$unit)
 $bitmap.Save((Join-Path (Get-Location) "web/icon-$size.png"),[System.Drawing.Imaging.ImageFormat]::Png)
 $graphics.Dispose(); $bitmap.Dispose(); $light.Dispose(); $dark.Dispose()
}
