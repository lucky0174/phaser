<?php
    if (isset($_GET['src']))
    {
        $src = $_GET['src'];
    }

    require 'src/Block.php';
    require 'src/ClassDesc.php';
    require 'src/Constant.php';
    require 'src/Method.php';
    require 'src/Parameter.php';
    require 'src/Property.php';
    require 'src/ReturnType.php';
    require 'src/Processor.php';
    require 'src/PhaserDocGen.php';
?>
<!doctype html>
<html>
    <head>
        <meta charset="UTF-8" />
        <title>Phaser Documentation Generator</title>
        <style type="text/css">
            body {
                font-family: Arial;
                font-size: 14px;
                background-color: #fff;
                color: #000;
            }

            textarea {
                width: 100%;
                height: 1000px;
            }
        </style>
    </head>
    <body>

    <pre>
<?php

    $gen = new PhaserDocGen();
    $gen->start();
    // $gen->extend();

    ksort($gen->uniqueTypes);
    echo "There are " . count($gen->uniqueTypes) . " unique data types \n\n";
    print_r($gen->uniqueTypes);

    $gen->extend('Phaser.Sprite');
    $sprite = $gen->get('Phaser.Sprite');
    $sprite->export('output/');


    // echo $sprite;

    /*
    foreach ($gen->classes as $key => $processor)
    {
        echo $key . " = " . $processor . "\n";
        // echo $processor . "\n";
        // echo $key . "\n";
    }

    echo "\n";
    echo " - EXTENDING ... \n";
    echo "\n";

    $gen->extend();

    foreach ($gen->classes as $key => $processor)
    {
        echo $key . " = " . $processor . "\n";
    }
    */

?>
    </pre>

</body>
</html>