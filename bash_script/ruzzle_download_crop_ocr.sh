#! /usr/bin/env bash



sourceImage="temp/ruzzle_screenshot.png"
outputFile="temp/output.txt"
logDir=logs/$(date +%Y%m%d_%H%M%S)



xDelta=0
yDelta=0

imageFileName="";
outputFileName="";

# Download image from phone
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png $sourceImage


convert $sourceImage -rotate "90>"  -colorspace gray $sourceImage

rm $outputFile
mkdir $logDir
cp $sourceImage $logDir/ruzzle_screenshot.png

for y in {0..3}
do

	for x in {0..3}
	do

	   xDelta=$[92+$x*176]
	   yDelta=$[370+$y*182]
	   imageFileName="temp/letter_"$x"_"$y".png";
	   outputFileName="temp/output_"$x"_"$y"";
	   # echo "test $x $y $xDelta $yDelta $fileName"
	   convert $sourceImage -crop 80x80+$xDelta+$yDelta $imageFileName
	   tesseract $imageFileName $outputFileName -psm 10 tesseract.conf
	   value=`cat $outputFileName.txt`

	   
	   cp $imageFileName $logDir/"letter_"$x"_"$y".png";
	   #rm $outputFileName.txt
	   #rm $imageFileName
	   echo $value  | tr -d '\n' >> $outputFile

	done

	#echo -e "\n" >> $outputFile

done

cp $outputFile $logDir/output.txt
